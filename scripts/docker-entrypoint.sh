#!/bin/sh

# Function to process .env.example files in plugins
process_plugin_env_files() {
  echo "Processing .env.example files in plugins..."
  
  for plugin in $(echo $PLUGIN_NAMES | tr "," "\n"); do
    PLUGIN_ENV_FILE_PATH="$PLUGIN_BASE_PATH${plugin}/.env.example"

    if [ -f "$PLUGIN_ENV_FILE_PATH" ]; then
      echo "Found .env.example in plugin: $plugin"

      # Add an empty line before adding the new plugin variables
      echo "" >> "$ENV_FILE_PATH"
      
      while IFS= read -r line || [ -n "$line" ]; do
        # Output for debugging
        echo "Read line: '$line'"

        if echo "$line" | grep -q '^[A-Za-z0-9_.-]\+=\([^#]*\)$'; then
          key="${line%%=*}"
          if ! key_exists_in_env "$key"; then
            echo "Adding $key from $plugin .env.example to .env"
            echo "$line" >> "$ENV_FILE_PATH"
          else
            echo "Skipping $key as it already exists in .env"
          fi
        else
          echo "Skipping line: '$line' (doesn't match pattern)"
        fi
      done < "$PLUGIN_ENV_FILE_PATH"

      # Ensure last line is processed
      if [ -n "$line" ]; then
        echo "$line" >> "$ENV_FILE_PATH"
      fi
    else
      echo "No .env.example found for plugin: $plugin"
    fi
  done
}

# Function to check if a key exists in .env file
key_exists_in_env() {
  local key="$1"
  grep -q "^$key=" "$ENV_FILE_PATH"
}

# Function to validate and sanitize input
sanitize_input() {
  local input="$1"
  # Check that the key contains only allowed characters: letters, numbers, and '_', '.', '-'
  if echo "$input" | grep -Eq '^[A-Za-z0-9_.-]+=.*$'; then
    # Escaping potentially dangerous characters in the value (after '=')
    local key="${input%%=*}"
    local value="${input#*=}"
    # removing potentially dangerous characters
    value=$(echo "$value" | sed 's/[&;|$`\\]//g')
    # Return sanitized key-value pair
    echo "$key=$value"
  else
    echo "Skipping invalid input: $input"
    # Indicate failure
    return 1
  fi
}

# Function to append or update command-line parameters in the .env file
append_or_update_cmdline_vars() {
  echo "Appending or updating command-line parameters in .env file"
  for var in "$@"; do
    if echo "$var" | grep -q '='; then
      sanitized_var=$(sanitize_input "$var")
      if [ $? -eq 0 ]; then
        key="${sanitized_var%%=*}"
        value="${sanitized_var#*=}"

        # Safely replace or append the variable in .env file
        if grep -q "^$key=" "$ENV_FILE_PATH"; then
          echo "Updating variable: $key"
          awk -v key="$key" -v value="$value" -F= '$1 == key { $0 = key "=" value } 1' "$ENV_FILE_PATH" > temp_env && mv temp_env "$ENV_FILE_PATH"
        else
          echo "Adding variable: $key"
          echo "$sanitized_var" >> "$ENV_FILE_PATH"
        fi
      fi
    fi
  done
}

# This variable sets the path to the .env file, which is located at the root of the container.
# IMPORTANT: all paths are specified as relative (without a slash at the beginning)
# - this means that the path to the file is inside the WORKDIR folder (app)
ENV_FILE_PATH="easylayer/.env"
EXAMPLE_ENV_FILE_PATH=".env.example"
DATA_FOLDER_PATH="easylayer/data"
BIN_PATH="node_modules/.bin"
YARN_BIN=".yarn/releases/yarn-3.6.0.cjs"
PLUGIN_BASE_PATH="node_modules/@easylayer/"

mkdir -p "easylayer"

# Get UID and GID from environment variables set by Docker
# If not passed, use root (UID=0, GID=0)
USER_ID=${UID:-0}
GROUP_ID=${GID:-0}

# Check if the .env file exists.
# If not, create the file. 
# This ensures that the application has an environment file to read from.
# Check if the .env file exists. If not, create the file.
if [ ! -f "$ENV_FILE_PATH" ]; then
  echo "Creating .env file from .env.example"
  cp "$EXAMPLE_ENV_FILE_PATH" "$ENV_FILE_PATH"
else
  echo ".env file already exists. Appending .env.example contents to .env."
  
  while IFS= read -r line; do
    if echo "$line" | grep -q '='; then
      key="${line%%=*}"
      if ! key_exists_in_env "$key"; then
        echo "Adding $key from .env.example to .env"
        echo "$line" >> "$ENV_FILE_PATH"
      else
        echo "Skipping $key as it already exists in .env"
      fi
    fi
  done < "$EXAMPLE_ENV_FILE_PATH"
fi

# Ensure the data directory exists, 
# which can be used for storing application data,
# such as a SQLite database. 
# Creating this directory ensures data persistence 
# if you bind the directory to a host volume.
if [ ! -d "$DATA_FOLDER_PATH" ]; then
  echo "Creating data directory"
  mkdir -p "$DATA_FOLDER_PATH"
fi

# Change the owner of the folder and file to the specified UID and GID if they are not root
if [ "$USER_ID" -ne 0 ] && [ "$GROUP_ID" -ne 0 ]; then
  chown -R ${USER_ID}:${GROUP_ID} /easylayer
else
  echo "Using root as the default user."
fi

# Initialize a new Node.js project if package.json does not exist
if [ ! -f "/package.json" ]; then
  echo "Initializing new Node.js project"
  $YARN_BIN init -y
fi

# Install base package
echo "Installing Base package: @easylayer/base@$PUBLISH_VERSION"
$YARN_BIN add "@easylayer/base@$PUBLISH_VERSION"

# Install additional npm packages if any
if [ ! -z "$PLUGIN_NAMES" ]; then
  for plugin in $(echo $PLUGIN_NAMES | tr "," "\n"); do
    if $YARN_BIN list --pattern "@easylayer/$plugin" | grep -q "@easylayer/$plugin"; then
      echo "Plugin @easylayer/$plugin is already installed. Skipping..."
    else
      echo "Installing plugin: @easylayer/$plugin@$PUBLISH_VERSION"
      $YARN_BIN add "@easylayer/$plugin@$PUBLISH_VERSION"
    fi
  done
fi

# We specify the .bin folder from node_modules to enable the ability to run packages via the command line.
# Loop through each plugin name in PLUGIN_NAMES and add it directly to PATH
for plugin in $(echo $PLUGIN_NAMES | tr "," "\n"); do
  plugin_executable="$BIN_PATH/$plugin"

  if [ -f "$plugin_executable" ]; then
    echo "Adding $plugin_executable to PATH"
    export PATH="$BIN_PATH:$PATH"
  else
    echo "Executable for $plugin not found in $BIN_PATH"
  fi
done

# Process .env.example files in plugins after all plugins are installed
process_plugin_env_files

# Append command-line parameters to the .env file
append_or_update_cmdline_vars "$@"

# Run the bootstrap method from the specified package
echo "Running bootstrap method..."
node -e "
  (async () => {
    try {
      const packageName = '@easylayer/base';
      const pkg = require(packageName);
      if (typeof pkg.bootstrap === 'function') {
        await pkg.bootstrap({});
      } else {
        console.error('Bootstrap method not found in package', packageName);
        process.exit(1);
      }
    } catch(error) {
      console.error('Bootstrap catch error', error);
      process.exit(1);
    }
  })();
"
