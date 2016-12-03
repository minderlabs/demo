//
// Copyright 2016 Minder Labs.
//

'use strict';

const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

const baseConfig = require('./webpack-base.config.js');

//
// Webpack client configuration.
//

module.exports = _.merge(baseConfig, {

  target: 'web',

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.github.io/docs/configuration.html#devtool
  devtool: '#eval-source-map',

  entry: {

    website: [
      path.resolve(baseConfig.context, 'src/website/site.js')
    ],

    test: [
      path.resolve(baseConfig.context, 'src/client/test.js')
    ],

    main: [
      path.resolve(baseConfig.context, 'src/client/main.js')
    ],

    hot: [
      path.resolve(baseConfig.context, 'src/client/main.js'),

      // BABEL_NODE=hot NODE_ENV=hot
      // HMR client (connects to dev app server).
      'webpack/hot/dev-server',
      'webpack-hot-middleware/client'
    ]
  },

  output: {
    path: path.resolve(baseConfig.context, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/assets/' // Path for webpack-dev-server
  },
});
