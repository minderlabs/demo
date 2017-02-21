#!/bin/sh

#
# Misc tools.
#

brew install jq
brew install npm

npm install -g firebase-tools
npm install -g npm-workspace
npm install -g webpack
npm install -g karma-cli
npm install -g grunt

$(dirname -- "$0")/update.sh

