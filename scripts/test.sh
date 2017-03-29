#!/bin/sh

#
# Run node tests.
#

MODULES=( "core" "graphql" )

for mod in $"${MODULES[@]}"; do
  echo "\n### [$mod] ###"
  pushd sub/$mod
  npm test
  popd
done
