#!/bin/sh

#
# Workspace
# https://github.com/mariocasciaro/npm-workspace
# NOTE:
# - add modules to package.json config directly (cannot npm install)
# - check dependency name matches name in sub-component's package.json
#

npm install -g npm-workspace

npm-workspace clean
npm-workspace install

# TODO(burdon): Is this needed?
pushd sub/core    && npm-workspace install -v && popd
pushd sub/graphql && npm-workspace install -v && popd
pushd sub/apollo  && npm-workspace install -v && popd
