#!/bin/sh

#
# Update node deps.
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
  npm prune
  npm update
  npm outdated
  popd
done
