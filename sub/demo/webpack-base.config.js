//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

const path = require('path');
const webpack = require('webpack');

// https://github.com/webpack/extract-text-webpack-plugin
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const LIB_DIR = path.resolve(__dirname, 'common');

//
// Webpack base configuration.
// TODO(burdon): Move all javascript files under common src directory.
//

module.exports = {

  resolve: {
    extensions: ['', '.js'],

    // Where to resolve imports/requires.
    modulesDirectories: [
      'node_modules'
    ],

    alias: {
      'sinon': 'sinon/pkg/sinon'
    }
  },

  module: {

    // NPM modules
    // https://webpack.github.io/docs/configuration.html#module-loaders
    resolveLoader: {
      root: path.join(__dirname, 'node_modules')
    },

    noParse: [
      /node_modules\/sinon\//,
    ],

    loaders: [

      // Required to load schema.json
      // https://github.com/request/request/issues/1529
      {
        test: /\.json$/,
        loader: 'json-loader'
      },

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

      // See .babelrc for the presets.
      // https://github.com/babel/babel-loader
      {
        test: /\.js$/,
        exclude: [/node_modules/],                      // Don't transpile deps.
        include: [
          path.resolve(__dirname, 'index.web.js'),
          LIB_DIR
        ],
        loader: 'babel-loader'
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
