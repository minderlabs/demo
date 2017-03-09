#!/usr/bin/env bash

# TODO(burdon): Factor out with sub/scheduler/scripts (and move to top-level?)

#
# NOTE: Redeploy nx-lite frontend.yml for stack configuration.
# nx-lite/scripts/prod_redeploy_stack.sh
# TODO(burdon): Configure script for Jenkins.
#

TAG=minder-web-server
REPO=minder-web-server
VERSION=latest

# Kubernetes label.
RUN_LABEL=web

KUBE_CREATE=0
VERSION_BUMP=0
DOCKER_REPO=ecr

NAMESPACE=240980109537.dkr.ecr.us-east-1.amazonaws.com

for i in "$@"
do
case $i in
  --create)
  KUBE_CREATE=1
  ;;
esac
done

echo
echo "================================================================================"
echo ${NAMESPACE}/${REPO}:${VERSION}
echo "================================================================================"
echo

kubectl config use-context web.k.minderlabs.com
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
webpack --config webpack-server.config.js

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

#
# https://console.aws.amazon.com/iam/
# NOTE: On error check ~/.aws/credentials matches IAM keys.
# NOTE: Check also not clobbered by AWS_SECRET_ACCESS_KEY, etc.
#

docker push ${NAMESPACE}/${REPO}:${VERSION}

#
# Redeploy the service.
#

if [ $KUBE_CREATE -eq 1 ]; then
  kubectl create -f ../../config/k8s/web.yml
fi

kubectl delete $(kubectl get pods -l run=$RUN_LABEL -o name)
