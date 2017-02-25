#!/usr/bin/env bash

# Exit if command fails.
set -e

TAG=jupyter
REPO=jupyter
VERSION=${1:-latest}
DOCKER_REPO=${2:-ecr}

NAMESPACE=240980109537.dkr.ecr.us-east-1.amazonaws.com

cd "$(dirname "$0")/.."

CONFIG_DIR=config

mkdir -p $CONFIG_DIR

to_copy=(
  "$HOME/.ssh/jupyter-keypair.pem"
  "$HOME/.aws/credentials"
  "$HOME/.gitconfig" )

for fname in "${to_copy[@]}"; do
  cp $fname $CONFIG_DIR/
done

case "$DOCKER_REPO" in
  minikube)
    eval $(minikube docker-env)
    NAMESPACE=minderlabs
    ;;
esac

docker build -t ${TAG}:${VERSION} .
rm -rf $CONFIG_DIR

docker tag ${TAG}:${VERSION} ${NAMESPACE}/${REPO}:${VERSION}

case "$DOCKER_REPO" in
  ecr)
    # Login to AWS ECR.
    # https://forums.aws.amazon.com/thread.jspa?messageID=692733
    eval $(AWS_PROFILE=minder aws ecr get-login)

    docker push ${NAMESPACE}/${REPO}:${VERSION}
    ;;
  minikube)
    echo "Nothing to push for minikube."
    ;;
esac
