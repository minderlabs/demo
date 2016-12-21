#!/usr/bin/env bash

#
# NOTE: Redeploy nx-lite frontend.yml for stack configuration.
# nx-lite/scripes/prod_redeploy_stack.sh
# TODO(burdon): Configure script for Jenkins.
#

NAMESPACE=minderlabs
REPO=demo
TAG=demo

set -e
set -v

#
# Connect.
#

eval "$(docker-machine env ${DOCKER_MACHINE})"

#
# Build client.
# TODO(burdon): Move build steps to Dockerfile?
#

webpack
webpack --config webpack-server.config.js

#
# Create package.json for Dockerfile's npm install.
#

./scripts/create_package_file.py dist/package.json

#
# Build docker image.
#

docker build -t ${TAG} .

#
# Tag image.
#

docker tag ${TAG} ${NAMESPACE}/${REPO}:latest

#
# Push to Docker Hub.
# Triggers docker push redeploy.
#

docker push ${NAMESPACE}/${REPO}

