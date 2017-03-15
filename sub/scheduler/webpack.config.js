//
// Copyright 2016 Minder Labs.
//

'use strict';

const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');

const baseConfig = require('./webpack-base.config.js');

//
// Webpack client configuration.
//

module.exports = _.merge(baseConfig, {

  target: 'node',

  // Don't bundle node_modules for node target.
  // https://www.npmjs.com/package/webpack-node-externals
  externals: [nodeExternals()],

  entry: {
    scheduler: [
      path.resolve(baseConfig.context, 'src/main.js')
    ]
  },

  output: {
    path: path.resolve(baseConfig.context, 'dist'),
    filename: '[name].bundle.js'
  }
});
