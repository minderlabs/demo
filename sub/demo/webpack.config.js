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

module.exports = _.merge(baseConfig, {

  target: 'web',

  // http://gaearon.github.io/react-hot-loader/getstarted
  // TODO(burdon): Version 3: https://github.com/gaearon/react-hot-loader

  entry: [
//  'webpack/hot/dev-server',
//  'webpack-hot-middleware/client',

    path.resolve(__dirname, 'index.web.js')
  ],

  output: {
    path: BUILD_DIR,
    filename: '[name].bundle.js',

    publicPath: '/assets/' // Path for webpack-dev-server
  }

});
