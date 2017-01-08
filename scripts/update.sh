#!/bin/sh

#
# Workspace (manages npm link with transitive closure).
# https://github.com/mariocasciaro/npm-workspace
# TODO(burdon): These take forever and the docs are confused about the need for it.
# Manually add deps to package.json then manually run npm-workspace in the directory to create the link.
#
# NOTE:
# - add modules to package.json config directly (cannot npm install)
# - check dependency name matches name in sub-component's package.json
#

#
# TODO(burdon): Not suitabler for prod.
# NOTE: npm link causes multiple copies of modules to appear (each has their own global variables).
# https://facebook.github.io/react/warnings/refs-must-have-owner.html#multiple-copies-of-react
#

DIRS=(
  'sub/core'
  'sub/ux'
  'sub/graphql'
  'sub/apollo'
)

for dir in $"${DIRS[@]}"; do
  echo "\n### [${dir}] ###"
  pushd ${dir}

  # Remove existing.
  rm -f node_modules/minder-*

  # Create new links.
  npm-workspace install

  # Add us to the local repo.
  npm link

  # Update npm.
  npm update
  npm prune
  npm outdated

  popd
done

#
# Update GraphQL Schema.
#

pushd sub/graphql
npm run update-schema
popd
