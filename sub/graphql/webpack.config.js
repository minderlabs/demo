//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

const _ = require('lodash');
const path = require('path');

const baseConfig = require('./webpack-base.config.js');

//
// Webpack default configuration.
//

module.exports = _.merge(baseConfig, {

  entry: {
    main: [
      path.resolve(baseConfig.context, 'src/main.js')
    ]
  },

  output: {
    path: path.join(baseConfig.context, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/assets/' // Path for webpack-dev-server
  }
});
