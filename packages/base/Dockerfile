#
#  documentation tags: 9af1adbe-69ad-4c2b-94d6-a03cf4349b63
#

# Use the official Node.js 18 image from Docker Hub
FROM node:18-alpine AS production

# Install common dependencies
RUN set -x && \
    apk --no-cache add \
    build-base \    
    libc6-compat \
    python3 \
    py3-pip \
    py3-setuptools \
    sqlite
    
# Set the working directory to the root directory
WORKDIR /

COPY .env.example /.env.example

# Copy the entry point script to the container
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh

# Make the script executable
RUN chmod +x /docker-entrypoint.sh

# Set an environment variable to store the version
ARG PUBLISH_VERSION
ENV PUBLISH_VERSION=$PUBLISH_VERSION

# Expose the application port
EXPOSE 3000

# Set the default command to run the script
CMD ["sh", "/docker-entrypoint.sh"]