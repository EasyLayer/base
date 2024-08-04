#!/bin/sh

# This variable sets the path to the .env file, which is located at the root of the container.
ENV_FILE_PATH="/.env"

# Check if the .env file exists.
# If not, create the file. 
# This ensures that the application has an environment file to read from.
if [ ! -f "$ENV_FILE_PATH" ]; then
  echo "Creating .env file"
  touch "$ENV_FILE_PATH"
fi

# Ensure the data directory exists, 
# which can be used for storing application data,
# such as a SQLite database. 
# Creating this directory ensures data persistence 
# if you bind the directory to a host volume.
if [ ! -d "/data" ]; then
  echo "Creating data directory"
  mkdir -p /data
fi

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
      const packageName = '@easylayer/base';
      const package = require(packageName);
      if (typeof package.bootstrap === 'function') {
        await package.bootstrap();
      } else {
        console.error('Bootstrap method not found in package', packageName);
        process.exit(1); // Terminate with an error
      }
  })();
"
