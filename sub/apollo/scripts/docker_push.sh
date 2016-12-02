#!/usr/bin/env bash

#
# NOTE: Redeploy nx-lite frontend.yml for stack configuration.
# nx-lite/scripes/prod_redeploy_stack.sh
# TODO(burdon): Configure script for Jenkins.
#

set -e
set -v

#
# Build client.
# TODO(burdon): Move build steps to Dockerfile?
#

webpack

#
# Create package.json for Dockerfile's npm install.
#

./scripts/create_package_file.py dist/package.json

#
# Build docker image.
#

docker build -t node-apollo .

#
# Tag image.
#

docker tag node-apollo alienlaboratories/node-apollo:latest

#
# Push to Docker Hub.
# Triggers docker push redeploy.
#

docker push alienlaboratories/node-apollo
