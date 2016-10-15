//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

var _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

var baseConfig = require('./webpack-base.config.js');

const BUILD_DIR = path.resolve(__dirname, 'server/assets');

module.exports = _.merge(baseConfig, {

  entry: path.resolve(__dirname, 'index.web.js'),

  output: {
    path: BUILD_DIR,
    filename: 'main.bundle.js'
  },

});
