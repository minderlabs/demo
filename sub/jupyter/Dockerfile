#
# Copyright 2017 Minder Labs.
#

#
# Jupyter notebook and python env with ML frameworks (tensorflow, theano, keras) and GPU support.
#
# To ssh into this container as user jovyan, do:
# kubectl exec $(kc get pods -l run=jupyter -o name | sed -e 's/^pod\///') -ti -- bash

FROM lukovkin/dockerfile-cuda-tensorflow-keras-jupyter

RUN apt-get update \
  && apt-get install -yq \
    ssh \
    wget \
  && apt-get clean -y

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

ENV HOME=/root

CMD ["start-notebook.sh"]
COPY start-notebook.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/start-notebook.sh

COPY jupyter_notebook_config.py $HOME/.jupyter/
COPY bashrc.txt $HOME/.bashrc
COPY vimrc $HOME/.vimrc

COPY requirements.txt $HOME/

RUN \
  mkdir -p $HOME/.ssh && \
  mkdir -p $HOME/.aws && \
  ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts

COPY config/.gitconfig $HOME/.gitconfig
COPY config/jupyter-keypair.pem $HOME/.ssh/jupyter-keypair.pem
RUN chmod 600 $HOME/.ssh/jupyter-keypair.pem
COPY config/.aws/credentials $HOME/.aws/credentials
