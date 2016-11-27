#!/bin/sh

#
# Run node tests.
#

DIRS=(
  'sub/core'
  'sub/graphql'
)

for dir in $"${DIRS[@]}"; do
  echo "\n### [$dir] ###"
  pushd $dir
  karma start --single-run
  popd
done
