#!/bin/sh

#
# Misc tools.
#

brew install hilite
brew install jq
brew install memcached
brew install npm

npm install -g firebase-tools
npm install -g grunt
npm install -g karma-cli
npm install -g nodemon
npm install -g npm-workspace
npm install -g webpack

#
# Install NPM packages (>5 mins first time).
#

$(dirname -- "$0")/update.sh
