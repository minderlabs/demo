#!/usr/bin/env bash

# TODO(burdon): Factor out with sub/scheduler/scripts (and move to top-level?)

#
# NOTE: Redeploy nx-lite frontend.yml for stack configuration.
# nx-lite/scripts/prod_redeploy_stack.sh
# TODO(burdon): Configure script for Jenkins.
#

TAG=minder-app-server
REPO=minder-app-server
VERSION=latest

# Kubernetes label.
RUN_LABEL=demo

KUBE_CREATE=0
VERSION_BUMP=0
DOCKER_REPO=ecr
BUILD_ONLY=0

for i in "$@"
do
case $i in
  --create)
  KUBE_CREATE=1
  ;;

  --repo=*)
  DOCKER_REPO="${i#*=}"
  shift
  ;;

  --build-only)
  BUILD_ONLY=1
  ;;

  --bump)
  VERSION_BUMP=1
  ;;
esac
done

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
# Bump version (must happen before webpack).
# TODO(burdon): Git commit/push and merge master after this.
#

if [ $VERSION_BUMP -eq 1 ]; then
  grunt version:app:patch
fi

#
# Build webpack modules.
# TODO(burdon): Move build steps to Dockerfile?
#

webpack
webpack --config webpack-srv.config.js

#
# Create package.json for Dockerfile's npm install.
#

../tools/src/python/create_package_file.py --output dist/package.json \
  --pkg minder-core       \
  --pkg minder-graphql    \
  --pkg minder-scheduler  \
  --pkg minder-services   \
  --pkg minder-ux

#
# Build docker image.
#

docker build -t ${TAG}:${VERSION} .

if [ $BUILD_ONLY -eq 1 ]; then
  exit
fi

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
    eval $(AWS_PROFILE=minder aws ecr get-login --region us-east-1)
    ;;
esac

#
# NOTE: On error check ~/.aws/credentials matches IAM keys.
# Check "aws ecr get-login --region us-east-1" (will fail if credentials don't match).
# NOTE: export AWS_PROFILE=minder (or [minder] in credentials).
# NOTE: Check also not clobbered by AWS_SECRET_ACCESS_KEY, etc.
# https://console.aws.amazon.com/iam/home?region=us-east-1#/users [Security credentials]
#

docker push ${NAMESPACE}/${REPO}:${VERSION}

#
# Redeploy the service.
#

if [ $KUBE_CREATE -eq 1 ]; then
  kubectl create -f ../../config/k8s/demo.yml
fi

kubectl delete $(kubectl get pods -l run=$RUN_LABEL -o name)

#
# Check running version.
# https://console.aws.amazon.com/ecs/home?region=us-east-1#/repositories/${TAG}#images;tagStatus=ALL
# NOTE: kubectl replace -f demo.yml
#
# Dashboard (Logs)
# https://api.dev.k.minderlabs.com/api/v1/proxy/namespaces/kube-system/services/kubernetes-dashboard
# NOTE: Click advanced to proceed.
# username=admin; password in ~/.kube/config
#

STATUS_URL="https://demo-dev.minderlabs.com/status"
LOCAL_VERSION=$(cat "package.json" | jq '.version')

until [ ${LOCAL_VERSION} = $(curl -s ${STATUS_URL} | jq '.version') ]; do
  echo "Waiting..."
  sleep 5
done

echo "Deployed OK"

curl -s -w '\n' ${STATUS_URL}
kubectl get pods -l run=$RUN_LABEL -o name
