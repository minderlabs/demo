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

  // https://webpack.github.io/docs/configuration.html#node
  node: {
    // Otherwise __dirname === '/'
    __dirname: false,

    // http://webpack.github.io/docs/configuration.html#node
    console:  'empty',
    fs:       'empty',
    net:      'empty',
    tls:      'empty'
  },

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.github.io/docs/configuration.html#devtool
  devtool: '#eval-source-map',

  entry: {
    server: [
      // This is automatically loaded when using babel-node, but required for runtime builds.
      // https://babeljs.io/docs/usage/polyfill
      'babel-polyfill',

      path.resolve(baseConfig.context, 'src/server/server.js')
    ]
  },

  output: {
    path: path.resolve(baseConfig.context, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/assets/' // Path for webpack-dev-server
  },

  externals: [nodeExternals({
    whitelist: [
      'minder-core',
      'minder-graphql'
    ]}
  )]
});
