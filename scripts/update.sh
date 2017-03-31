#!/bin/sh

#
# Workspace (manages npm link with transitive closure).
# NOTE: This may take 5-10 minutes on first install.
# https://github.com/mariocasciaro/npm-workspace
#
# npm link causes multiple copies of modules to appear (each has their own global variables).
# https://facebook.github.io/react/warnings/refs-must-have-owner.html#multiple-copies-of-react
#

MODULES=( "app" "scheduler" )

for mod in ${MODULES[@]}; do
  pushd sub/$mod
  npm-workspace install
  popd
done

#
# Update GraphQL Schema.
#

pushd sub/graphql
npm run update-schema
popd
