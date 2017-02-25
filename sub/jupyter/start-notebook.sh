#!/bin/bash

# Run post-deploy install, and then start the notebook.

set -e

cd /notebook

eval `ssh-agent -s`
ssh-add $HOME/.ssh/jupyter-keypair.pem

# Do not clone over existing directory, in case of restarts with persistent volume.
if [ ! -d /notebook/research ]; then
  git clone git@github.com:minderlabs/research.git
fi

source activate keras

# Install requirements from shared volumes mounted at runtime.
pip install -r $HOME/requirements.txt

if [ -z $EXPERIMENT_ID ]; then
  jupyter notebook --no-browser --ip=0.0.0.0
else
  python /notebook/research/scripts/run_training.py --eid $EXPERIMENT_ID
fi
