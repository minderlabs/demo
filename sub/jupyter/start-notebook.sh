#!/bin/bash

# Manage EBS mount permissions, and then start the notebook server.
# The container needs to be run as root (via securityContext).

# Based on:
# https://github.com/jupyter/docker-stacks/blob/master/base-notebook/start-notebook.sh

set -e

# Check that user jovyan owns the EBS mount point.
if [ -O /home/jovyan/work ]; then
  chown jovyan:users /home/jovyan/work
fi

. /usr/local/bin/start.sh jupyter notebook $*
