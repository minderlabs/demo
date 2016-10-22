//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

var _ = require('lodash');
const path = require('path');

var baseConfig = require('./webpack-base.config.js');

const BUILD_DIR = path.resolve(__dirname, 'dist');

//
// Node (server) config.
//

module.exports = _.merge(baseConfig, {

  target: 'node',

  // https://webpack.github.io/docs/configuration.html#node
  node: {
    __dirname: true   // Referenced by main.js
  },

  entry: {
    server: path.resolve(__dirname, 'js/server/main.js')
  },

  output: {
    path: BUILD_DIR,
    filename: '[name].bundle.js'
  }

});
