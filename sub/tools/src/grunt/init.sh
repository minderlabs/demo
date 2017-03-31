#!/bin/sh

#
# Install common modules required by Grunt.
#

MODULES=( "app" "core" "graphql" "scheduler" "services" "ux" )

for mod in ${MODULES[@]}; do
  pushd sub/$mod

  npm install --save-dev grunt grunt-dev-update

  popd
done
