#!/bin/sh

brew update

#
# Dev tools.
#

brew install hilite
brew install jq
brew install memcached
brew install npm

brew install docker
brew install docker-machine
brew cask install virtualbox

npm install -g npm-check-updates
npm install -g firebase-tools
npm install -g grunt
npm install -g jest
npm install -g karma-cli
npm install -g nodemon
npm install -g npm-workspace
npm install -g webpack
npm install -g babel-cli

#
# Ops tools.
#

brew install kubectl
brew install kops
brew install python

# Add to PATH: ~/Library/Python/2.7/bin
pip install --upgrade --user awscli
pip install --upgrade virtualenv

#
# Install NPM packages (>5 mins first time).
#

$(dirname -- "$0")/update.sh
