#
# Copyright 2017 Minder Labs.
#

#
# Jupyter notebook and python env with ML frameworks (tensorflow, theano, keras) and GPU support.
#
# To ssh into this container as user jovyan, do:
# kubectl exec $(kc get pods -l run=jupyter -o name | sed -e 's/^pod\///') -ti -- bash

FROM lukovkin/dockerfile-cuda-tensorflow-keras-jupyter

#RUN apt-get update && apt-get -yq upgrade \
#  && apt-get install -yq \
#    git \
#    wget \
#  && apt-get clean -y

# Python installs.
# Remove mks, install openblas (nomks), otherwise gensim fails.
# 
RUN source activate keras \
  && conda install -y \
  nomkl numpy scipy scikit-learn numexpr \
  gensim \
  ipywidgets \
  'notebook=4.3'

# Disable GPU for now
ENV THEANO_FLAGS="mode=FAST_RUN,device=cpu,floatX=float32"

# Install bleeding-edge Lasagne
RUN source activate keras \
  && pip install --upgrade https://github.com/Lasagne/Lasagne/archive/master.zip

COPY jupyter_notebook_config.py /root/.jupyter/
COPY bashrc /root/.bashrc
COPY vimrc /root/.vimrc
