#!/bin/bash

# Stop the script on errors
set -e

# Get environment variables
baseVersion=$BASE_VERSION
suffix=$SUFFIX
increment=$INCREMENT
publishVersion="$baseVersion-$suffix.$increment"
tagName="v$publishVersion"
tokent=$PRERELEASE_WORKFLOW_PAT

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

# Publish packages with the suffix as a tag
echo "Publishing packages with tag: $suffix"
./node_modules/.bin/lerna publish from-package --no-private --dist-tag $suffix --yes --no-git-tag-version --force-publish

# Push to the Git branch using PAT
echo "Pushing to head branch"
git push https://$tokent@github.com/$GITHUB_REPOSITORY HEAD

# Push the Git tag using PAT
echo "Pushing tag $tagName to development branch"
git tag $tagName
git push origin $tagName https://$tokent@github.com/$GITHUB_REPOSITORY
