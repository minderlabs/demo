//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

var _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

// https://github.com/webpack/extract-text-webpack-plugin
const ExtractTextPlugin = require('extract-text-webpack-plugin');

//
// Webpack app configuration.
//

const BUILD_DIR = path.resolve(__dirname, 'dist');

module.exports = {

  target: 'web',

  entry: [
    path.resolve(__dirname, 'js/client/main.js')
  ],

  output: {
    path: BUILD_DIR,
    filename: '[name].bundle.js',

    publicPath: '/assets/' // Path for webpack-dev-server
  },

  devtool: 'inline-source-map',

  resolve: {
    extensions: ['', '.js'],

    // Where to resolve imports/requires.
    modulesDirectories: [
      'node_modules'
    ]
  },

  module: {

    // NPM modules
    // https://webpack.github.io/docs/configuration.html#module-loaders
    resolveLoader: {
      root: path.join(__dirname, 'node_modules')
    },

    loaders: [

      // https://github.com/webpack/less-loader
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader!less-loader')
      },

      // See .babelrc for the presets.
      // https://github.com/babel/babel-loader
      {
        test: /\.js$/,
        exclude: [/node_modules/],  // Don't transpile deps.
        include: [
          path.resolve(__dirname, 'js')
        ],
        loader: 'babel-loader'
      },

      // http://dev.apollodata.com/react/webpack.html
      {
        test: /\.(graphql|gql)$/,
        exclude: /node_modules/,
        loader: 'graphql-tag/loader'
      }
    ]
  },

  plugins: [

    new ExtractTextPlugin('[name].css'),

    new webpack.ProvidePlugin({
      _: 'lodash'
    })
  ]
};
