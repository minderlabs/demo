//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

var _ = require('lodash');
const path = require('path');

var baseConfig = require('./webpack-base.config.js');

const BUILD_DIR = path.resolve(__dirname, 'dist');

//
// App webpack config.
//

// TODO(burdon): Hot reloading [https://shellmonger.com/2016/02/02/automatic-builds-with-webpack]

module.exports = _.merge(baseConfig, {

  entry: {
    main: path.resolve(__dirname, 'index.web.js')
  },

  output: {
    path: BUILD_DIR,
    filename: '[name].bundle.js',

    publicPath: '/assets/' // Path for webpack-dev-server
  }

});
