#!/bin/sh

#
# Misc tools.
#

npm install -g firebase-tools


#
# Workspace (manages npm link with transitive closure).
# https://github.com/mariocasciaro/npm-workspace
#
# NOTE:
# - add modules to package.json config directly (cannot npm install)
# - check dependency name matches name in sub-component's package.json
#

npm install -g npm-workspace

npm-workspace clean
npm-workspace install

#
# TODO(burdon): These take forever and the docs are confused about the need for it.
# Manually add deps to package.json then manually run npm-workspace in the directory to create the link.
#

#
# https://facebook.github.io/react/warnings/refs-must-have-owner.html#multiple-copies-of-react
#

DIRS=(
  'sub/core'
  'sub/ux'
  'sub/graphql'
  'sub/apollo'
)

for dir in $"${DIRS[@]}"; do
  echo "\n### [$dir] ###"
  pushd $dir
  npm-workspace install -v
  popd
done
