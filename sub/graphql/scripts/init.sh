#!/bin/sh

#
# brew
#

brew update
brew install node
brew install phantomjs
brew outdated

#
# npm
#

npm update
npm install -g babel-cli
npm install -g karma
npm install -g karma-cli
npm install -g mocha
npm install -g nodemon
npm install -g webpack
npm outdated
