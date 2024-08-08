#!/bin/sh

# Function to validate and sanitize input
sanitize_input() {
  local input="$1"
  # Check that the key contains only allowed characters: letters, numbers, and '_', '.', '-'
  if echo "$input" | grep -Eq '^[A-Za-z0-9_.-]+=.*$'; then
    # Escaping potentially dangerous characters in the value (after '=')
    local key="${input%%=*}"
    local value="${input#*=}"
    value=$(echo "$value" | sed 's/[\&;\|$`\\]//g') # removing potentially dangerous characters
    echo "$key=$value"
  else
    echo "Skipping invalid input: $input"
  fi
}

# Function to append command-line parameters to the .env file
append_cmdline_vars() {
  echo "Appending command-line parameters to .env file"
  for var in "$@"; do
    if echo "$var" | grep -q '='; then
      sanitized_var=$(sanitize_input "$var")
      if [ -n "$sanitized_var" ]; then
        echo "" >> "$ENV_FILE_PATH" # Add a new line after each env variable
        echo "$sanitized_var" >> "$ENV_FILE_PATH"
      fi
    fi
  done
}

# This variable sets the path to the .env file, which is located at the root of the container.
ENV_FILE_PATH="/easylayer/.env"
EXAMPLE_ENV_FILE_PATH="/.env.example"
DATA_FOLDER_PATH="/easylayer/data"

mkdir -p "/easylayer"

# Get UID and GID from environment variables set by Docker
# If not passed, use root (UID=0, GID=0)
USER_ID=${UID:-0}
GROUP_ID=${GID:-0}

# Check if the .env file exists.
# If not, create the file. 
# This ensures that the application has an environment file to read from.
if [ ! -f "$ENV_FILE_PATH" ]; then
  echo "Creating .env file from .env.example"
  cp "$EXAMPLE_ENV_FILE_PATH" "$ENV_FILE_PATH"
else
  echo ".env file already exists. Appending .env.example contents to .env."
  cat "$EXAMPLE_ENV_FILE_PATH" >> "$ENV_FILE_PATH"
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

# Append command-line parameters to the .env file
append_cmdline_vars "$@"

# Initialize a new Node.js project if package.json does not exist
if [ ! -f "/package.json" ]; then
  echo "Initializing new Node.js project"
  yarn init -y
fi

# Install base package
echo "Installing Base package: @easylayer/base@$PUBLISH_VERSION"
yarn add "@easylayer/base@$PUBLISH_VERSION"

# Install additional npm packages if any
if [ ! -z "$PLUGIN_NAMES" ]; then
  for plugin in $(echo $PLUGIN_NAMES | tr "," "\n"); do
    if yarn list --pattern "@easylayer/$plugin" | grep -q "@easylayer/$plugin"; then
      echo "Plugin @easylayer/$plugin is already installed. Skipping..."
    else
      echo "Installing plugin: @easylayer/$plugin@$PUBLISH_VERSION"
      yarn add "@easylayer/$plugin@$PUBLISH_VERSION"
    fi
  done
fi

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
