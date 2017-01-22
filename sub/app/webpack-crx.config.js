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

    content_script: [
      path.resolve(baseConfig.context, 'src/crx/content_script.js')
    ],

    sidebar: [
      path.resolve(baseConfig.context, 'src/crx/sidebar.js')
    ]

  },

  output: {
    path: path.resolve(baseConfig.context, 'dist/crx/minder/assets'),
    filename: '[name].bundle.js'
  }
});
