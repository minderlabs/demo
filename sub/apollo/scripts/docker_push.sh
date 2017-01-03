#!/usr/bin/env bash

#
# NOTE: Redeploy nx-lite frontend.yml for stack configuration.
# nx-lite/scripts/prod_redeploy_stack.sh
# TODO(burdon): Configure script for Jenkins.
#

#NAMESPACE=minderlabs
#REPO=demo
#TAG=demo

#NAMESPACE=alienlaboratories
REPO=node-apollo
TAG=node-apollo
VERSION=latest


set -e
set -v

DOCKER_REPO=${1:-docker}

case "$DOCKER_REPO" in
  docker)
    NAMESPACE=alienlaboratories
    ;;
  ecr)
    # AWS ECR
    # https://console.aws.amazon.com/ecs/home?region=us-east-1#/repositories
    NAMESPACE=240980109537.dkr.ecr.us-east-1.amazonaws.com
    ;;
  *)
    echo Unknown docker repo $DOCKER_REPO
esac

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

docker build -t ${TAG}:${VERSION} .

#
# Tag image.
#

docker tag ${TAG}:${VERSION} ${NAMESPACE}/${REPO}:${VERSION}

#
# Push to Docker Hub.
# Triggers docker push redeploy.
#

docker push ${NAMESPACE}/${REPO}:${VERSION}

