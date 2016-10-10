//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

let path = require('path');
let webpack = require('webpack');

// https://github.com/webpack/extract-text-webpack-plugin
let ExtractTextPlugin = require('extract-text-webpack-plugin');

let BUILD_DIR = path.resolve(__dirname, 'server/assets');

let LIB_DIR = path.resolve(__dirname, 'common');

let config = {

  entry: path.resolve(__dirname, 'index.web.js'),

  output: {
    path: BUILD_DIR,
    filename: 'main.bundle.js'
  },

  module: {
    loaders: [

      // https://github.com/webpack/css-loader
      // https://webpack.github.io/docs/stylesheets.html
      // https://webpack.github.io/docs/stylesheets.html#separate-css-bundle
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader')
      },

      // https://github.com/webpack/less-loader
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader!less-loader')
      },

      // https://github.com/babel/babel-loader
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'index.web.js'),
          LIB_DIR
        ],
        loader: 'babel-loader'
        // See .babelrc for the presets.
      }
    ]
  },

  plugins: [
    new ExtractTextPlugin('main.css'),

    new webpack.ProvidePlugin({
      $: 'jquery'
    })
  ]

};

module.exports = config;
