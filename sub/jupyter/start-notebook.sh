#!/bin/bash

# Run post-deploy install, and then start the notebook or run an experiment.
#
# Environment parameters:
#   GIT_HASH: if present, check out this commit hash from the repo.
#   EXPERIMENT_ID: if present, run this experiment and exit. Otherwise start the notebook.

set -e

GIT_REPO="git@github.com:minderlabs/research.git"
REPO_DIR=research

eval `ssh-agent -s`
ssh-add $HOME/.ssh/jupyter-keypair.pem

cd /notebook

# Do not clone over existing directory, in case of restarts with persistent volume.
if [ ! -d $REPO_DIR ]; then
  git clone $GIT_REPO
fi
if [ ! -z $GIT_HASH ]; then
  echo Checking out git hash $GIT_HASH
  pushd $REPO_DIR
  git checkout $GIT_HASH
  git pull || true # ignore error return code, if not in a branch.
  popd
fi

source activate keras

# Install requirements from shared volumes mounted at runtime.
pip install -r $HOME/requirements.txt

if [ -z $EXPERIMENT_ID ]; then
  jupyter notebook --no-browser --ip=0.0.0.0
else
  python $REPO_DIR/scripts/run_experiment.py --eid $EXPERIMENT_ID
fi
