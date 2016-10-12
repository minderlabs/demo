#!/bin/sh

brew update
brew install node

npm update
npm install -g nodemon
npm install -g react-native-cli
npm install -g webpack
npm install -g webpack-dev-server
npm outdated
