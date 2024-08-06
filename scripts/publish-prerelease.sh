#!/bin/bash

# Stop the script on errors
set -e

# Get environment variables
baseVersion=$BASE_VERSION
suffix=$SUFFIX
increment=$INCREMENT
publishVersion="$baseVersion-$suffix.$increment"
tagName="v$publishVersion"
dockerUsername=$DOCKER_USERNAME
dockerToken=$DOCKER_ACCESS_TOKEN

# Update package versions (e.g., 0.0.1-beta.0)
echo "Setting package versions to: $publishVersion"
./node_modules/.bin/lerna version $publishVersion --exact --yes --no-git-tag-version --no-push --force-publish=*

# Install dependencies to update Yarn.lock
echo "Updating yarn.lock file"
yarn install

# Add changes to Git
echo "Committing version changes"
git config user.name "github-actions"
git config user.email "github-actions@github.com"
git add **/package.json yarn.lock lerna.json
git status
git commit -m "Prerelease: $tagName"

# Log in to Docker Hub
echo "Logging in to Docker Hub"
echo "${dockerToken}" | docker login -u "${dockerUsername}" --password-stdin

# Build Docker image using Docker Buildx for multi-platform support
echo "Building multi-platform Docker image"
docker buildx build \
  --platform linux/amd64 \  # Specify platforms
  --build-arg PUBLISH_VERSION=$publishVersion \  # Pass build arguments
  -t easylayer/base:$publishVersion ./packages/base/ \  # Set image tag
  --load # # Upload the image to the local Docker client

# Publish packages with the suffix as a tag
echo "Publishing packages with tag: $suffix"
./node_modules/.bin/lerna publish from-package --no-private --dist-tag $suffix --yes --no-git-tag-version --force-publish

# Push to the Git branch
echo "Pushing to head branch"
git push origin HEAD

# Push Docker image
echo "Pushing Docker image"
docker push easylayer/base:$publishVersion

# Create and push a Git tag
git tag $tagName
echo "Pushing tag $tagName"
git push origin $tagName
