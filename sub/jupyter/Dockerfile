#
# Copyright 2017 Minder Labs.
#

#
# Jupyter notebook and Python shell with modified script to support EBS volumes.
#
# To ssh into this container as user jovyan, do:
# kubectl exec $(kc get pods -l run=jupyter -o name | sed -e 's/^pod\///') -ti -- su -l jovyan

# NOTE: I've gotten spurious "authentication required" errors when pulling this image, I think
# because on slower networks the docker hub requests time out. Only workaround is faster network?
FROM jupyter/scipy-notebook

USER root

# FIXME: [FATAL tini (7)] Executing child process 'start-notebook.sh' failed: 'Permission denied'
# what user is it when start-notebook.sh is called?
#COPY start-notebook.sh /usr/local/bin/

USER $NB_USER
COPY bashrc /home/jovyan/.bashrc
