#!/bin/bash

# Stop the script on errors
set -e

# Get the version from lerna.json
version=$(jq -r '.version' lerna.json)
tagName="v$version"
dockerUsername=$DOCKER_USERNAME
dockerToken=$DOCKER_ACCESS_TOKEN

# Log in to Docker Hub
echo "Logging in to Docker Hub"
echo "${dockerToken}" | docker login -u "${dockerUsername}" --password-stdin

# Build Docker image using Docker Buildx for multi-platform support
echo "Building multi-platform Docker image"
docker buildx build \
  --platform linux/amd64 \
  --build-arg PUBLISH_VERSION=$version \
  -t easylayer/base:$version -t easylayer/base:latest ./packages/base/ \
  --load

# Publish packages with default "latest" tag
echo "Publishing packages with tag: latest"
./node_modules/.bin/lerna publish from-package --no-private --yes --no-git-tag-version --force-publish

# Push Docker image
echo "Pushing Docker image"
docker push easylayer/base:$version
docker push easylayer/base:latest

# Create and push a Git tag
echo "Pushing tag $tagName to master branch"
git config user.name "github-actions"
git config user.email "github-actions@github.com"
git tag $tagName
git push origin $tagName

# Output the tag name for later use in the workflow
echo "::set-output name=tag::$tagName"
