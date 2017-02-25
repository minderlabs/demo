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

pip install -r $HOME/requirements.txt

jupyter notebook --no-browser --ip=0.0.0.0
