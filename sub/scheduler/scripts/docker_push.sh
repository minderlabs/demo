#!/usr/bin/env bash

# TODO(burdon): Factor out with sub/app/scripts (and move to top-level?)

#
# NOTE: Redeploy nx-lite frontend.yml for stack configuration.
# nx-lite/scripts/prod_redeploy_stack.sh
# TODO(burdon): Configure script for Jenkins.
#

TAG=minder-scheduler
REPO=minder-scheduler
VERSION=latest

# Kubernetes label.
RUN_LABEL=demo

DOCKER_REPO=${1:-ecr}

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
    echo "Unknown docker repo $DOCKER_REPO"
esac

echo
echo "================================================================================"
echo ${NAMESPACE}/${REPO}:${VERSION}
echo "================================================================================"
echo

kubectl config use-context dev.k.minderlabs.com
kubectl config get-contexts

# Exit if command fails.
set -e

# Echo commands.
set -v

#
# Check Authorized.
#

kubectl cluster-info

#
# Connect.
#

eval "$(docker-machine env ${DOCKER_MACHINE})"

#
# Build webpack modules.
# TODO(burdon): Move build steps to Dockerfile?
#

webpack

#
# Create package.json for Dockerfile's npm install.
#

../tools/src/python/create_package_file.py dist/package.json

#
# Build docker image.
#

docker build -t ${TAG}:${VERSION} .

#
# Tag image.
#

docker tag ${TAG}:${VERSION} ${NAMESPACE}/${REPO}:${VERSION}

#
# Push to container repository (docker or AWS ECR).
#

case "$DOCKER_REPO" in
  ecr)
    # Login to AWS ECR.
    # https://forums.aws.amazon.com/thread.jspa?messageID=692733
    eval $(AWS_PROFILE=minder aws ecr get-login)
    ;;
esac

# TODO(burdon): push scheduler.
docker push ${NAMESPACE}/${REPO}:${VERSION}

#
# Redeploy the service.
#

#kubectl create -f ../../config/k8s/demo_services.yml
#kubectl create -f ../../config/k8s/scheduler.yml

kubectl delete $(kubectl get pods -l run=$RUN_LABEL -o name)
kubectl get pods -l run=$RUN_LABEL -o name
