//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

const _ = require('lodash');
const path = require('path');

const baseConfig = require('./webpack-base.config.js');

const BUILD_DIR = path.resolve(__dirname, 'dist');

//
// Webpack client config.
//
// NOTE: This config is imported by the server; must rebuild server if modified.
//

module.exports = _.merge(baseConfig, {

  target: 'web',

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.github.io/docs/configuration.html#devtool
  devtool: '#eval-source-map',

  // NOTE: See .babelrc for plugins.
  // http://gaearon.github.io/react-hot-loader/getstarted
  // https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
  // https://github.com/glenjamin/webpack-hot-middleware
  // TODO(burdon): Version 3: https://github.com/gaearon/react-hot-loader

  entry: [
    'webpack/hot/dev-server',
    'webpack-hot-middleware/client',

    path.resolve(__dirname, 'index.web.js')
  ],

  output: {
    path: BUILD_DIR,
    filename: '[name].bundle.js',

    publicPath: '/assets/' // Path for webpack-dev-server
  }
});
