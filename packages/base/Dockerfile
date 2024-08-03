#
#  documentation tags: 9af1adbe-69ad-4c2b-94d6-a03cf4349b63
#

# Use the official Node.js 18 image from Docker Hub
FROM node:18-alpine as production

# Install common dependencies
RUN set -x && \
    apk --no-cache add \
    libc6-compat \
    make \
    g++ \
    python3 \
    sqlite
    
# Set the working directory to the root directory
WORKDIR /

# Create the data directory for database storage
RUN mkdir -p /data

COPY .env.example /.env

# Copy the entry point script to the container
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh

# Make the script executable
RUN chmod +x /docker-entrypoint.sh

# Expose the application port
EXPOSE 3000

# Set the default command to run the script
CMD ["sh", "/docker-entrypoint.sh"]