//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

let webpack = require('webpack');
let path = require('path');

// https://github.com/webpack/extract-text-webpack-plugin
let ExtractTextPlugin = require('extract-text-webpack-plugin');

let BUILD_DIR = path.resolve(__dirname, 'server/assets');

let APP_DIR = path.resolve(__dirname, 'web');

let config = {

  entry: APP_DIR + '/main.jsx',

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
        test: /\.jsx$/,
        include : APP_DIR,
        loader: 'babel-loader',
        query: {
          presets: ['es2015', 'react']
        }
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
