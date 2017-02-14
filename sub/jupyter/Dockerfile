#
# Copyright 2017 Minder Labs.
#

#
# Jupyter notebook and Python shell with modified script to support EBS volumes.
#

# NOTE: I've gotten spurious "authentication required" errors when pulling this image, I think
# because on slower networks the docker hub requests time out. Only workaround is faster network?
FROM jupyter/scipy-notebook

USER root

ADD start-notebook.sh /usr/local/bin/

USER $NB_USER
