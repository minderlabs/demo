#!/usr/bin/env bash

#
# Tests the server bundle (use to test Dockerfile).
#

#webpack
webpack --config webpack-server.config.js

export MINDER_CONF_DIR='../src/common/conf/'
export MINDER_PUBLIC_DIR='../src/server/public/'
export MINDER_VIEWS_DIR='../src/server/views/'
export MINDER_ASSETS_DIR='./'
export MINDER_NODE_MODULES_DIR='../node_modules/'

node ./dist/server.bundle.js
