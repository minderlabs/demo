//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

let webpack = require('webpack');
let path = require('path');

let BUILD_DIR = path.resolve(__dirname, 'src/main/web/js');

let APP_DIR = path.resolve(__dirname, 'src/main/javascript/client');

let config = {

  entry: APP_DIR + '/main.jsx',

  output: {
    path: BUILD_DIR,
    filename: 'bundle.js'
  },

  module: {
    loaders: [
      // https://github.com/babel/babel-loader
      {
        test: /\.jsx$/,
        include : APP_DIR,
        loader: 'babel-loader',
        query: {
          presets: ['es2015', 'react']
        }
      }
    ]
  }
};

module.exports = config;
