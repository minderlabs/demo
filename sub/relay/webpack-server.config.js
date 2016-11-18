//
// Copyright 2016 Minder Labs.
//

'use strict';

const _ = require('lodash');
const path = require('path');

const nodeExternals = require('webpack-node-externals');

const baseConfig = require('./webpack-base.config.js');

const BUILD_DIR = path.resolve(__dirname, 'dist');

//
// Webpack Node server config.
//

module.exports = _.merge(baseConfig, {

  target: 'node',

  // https://www.npmjs.com/package/webpack-node-externals
  externals: [nodeExternals()], // Ignore node_modules.

  // https://webpack.github.io/docs/configuration.html#node
  node: {
    __dirname: true,   // Referenced by main.js

    console: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },

  entry: {
    server: path.resolve(__dirname, 'js/server/main.js')
  },

  output: {
    path: BUILD_DIR,
    filename: '[name].bundle.js'
  }

});
