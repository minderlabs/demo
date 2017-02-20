#!/usr/bin/env bash

# Exit if command fails.
set -e

TAG=jupyter
REPO=jupyter
VERSION=${1:-latest}
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

docker build -t ${TAG}:${VERSION} .
rm -rf $CONFIG_DIR

docker tag ${TAG}:${VERSION} ${NAMESPACE}/${REPO}:${VERSION}

# Login to AWS ECR.
# https://forums.aws.amazon.com/thread.jspa?messageID=692733
eval $(AWS_PROFILE=minder aws ecr get-login)

docker push ${NAMESPACE}/${REPO}:${VERSION}
