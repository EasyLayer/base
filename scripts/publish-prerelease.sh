#!/bin/bash

# Stop the script on errors
set -e

# Get environment variables
baseVersion=$BASE_VERSION
suffix=$SUFFIX
increment=$INCREMENT
publishVersion="$baseVersion-$suffix.$increment"
tagName="v$publishVersion"

# Update package versions (e.g., 0.0.1-beta.0)
echo "Setting package versions to: $publishVersion"
./node_modules/.bin/lerna version $publishVersion --exact --yes --no-git-tag-version --no-push --force-publish=*

# Install dependencies to update Yarn.lock
echo "Updating yarn.lock file"
yarn install

# Publish packages with the $publishVersion and the suffix as a tag
echo "Publishing packages with tag: $suffix"
./node_modules/.bin/lerna publish from-package --no-private --dist-tag $suffix --yes --no-git-tag-version --force-publish

# Add changes to Git and push to the development branch
echo "Committing version changes and pushing to development branch"
git config user.name "github-actions"
git config user.email "github-actions@github.com"
git add **/package.json yarn.lock lerna.json
git commit -m "prerelease: $tagName"
git push origin HEAD

# Create and push a Git tag
git tag $tagName
echo "Pushing tag $tagName to development branch"
git push origin $tagName
