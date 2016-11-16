#!/bin/sh

#
# Workspace
# https://github.com/mariocasciaro/npm-workspace
# NOTE:
# - add modules to package.json config directly (cannot npm install)
# - check dependency name matches name in sub-component's package.json
#

npm install -g npm-workspace

npm-workspace install

pushd sub/apollo  && npm-workspace install && popd
pushd sub/graphql && npm-workspace install && popd
