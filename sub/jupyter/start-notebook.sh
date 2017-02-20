#!/bin/bash

# Run post-deploy install, and then start the notebook.

set -e

cd /notebook

eval `ssh-agent -s`
ssh-add $HOME/.ssh/jupyter-keypair.pem
git clone git@github.com:minderlabs/research.git

source activate keras

pip install -r $HOME/requirements.txt

jupyter notebook --no-browser --ip=0.0.0.0
