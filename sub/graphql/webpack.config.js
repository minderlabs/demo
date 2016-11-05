//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

var _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

// const nodeExternals = require('webpack-node-externals');

//
// Webpack karma configuration.
//

// const BUILD_DIR = path.resolve(__dirname, 'dist');

module.exports = {

  target: 'node',

  // TODO(burdon): Separate config.
  // entry: {
  //   main: path.resolve(__dirname, 'js/main.js')
  // },
  //
  // output: {
  //   path: BUILD_DIR,
  //   filename: '[name].bundle.js'
  // },

  // NOTE: Must include for tests (otherwise "Can't find module require.")
  // https://www.npmjs.com/package/webpack-node-externals
  // externals: [nodeExternals()], // Ignore node_modules.

  // https://webpack.github.io/docs/configuration.html#node
  // node: {
  //   __dirname: true,   // Referenced by main.js
  //
  //   console: true,
  //   fs:  'empty',
  //   net: 'empty',
  //   tls: 'empty'
  // },

  devtool: 'inline-source-map',

  resolve: {
    extensions: ['', '.js'],

    // Where to resolve imports/requires.
    modulesDirectories: [
      'node_modules'
    ],

    // alias: {
    //   'cheerio':  'cheerio/index.js',
    //   'sinon':    'sinon/pkg/sinon.js'
    // }
  },

  module: {

    // // https://webpack.github.io/docs/configuration.html#module-noparse
    // noParse: [
    //   // https://github.com/webpack/webpack/issues/138
    //   /validate\.js/,
    //
    //   // https://github.com/webpack/webpack/issues/304
    //   /node_modules\/sinon\//
    // ],

    // NPM modules
    // https://webpack.github.io/docs/configuration.html#module-loaders
    resolveLoader: {
      root: path.join(__dirname, 'node_modules')
    },

    loaders: [

      // See .babelrc for the presets.
      // https://github.com/babel/babel-loader
      {
        test: /\.js$/,
        exclude: [/node_modules/],  // Don't transpile deps.
        include: [
          path.resolve(__dirname, 'js')
        ],
        loader: 'babel-loader'
      }
    ]
  },

  plugins: [

    new webpack.ProvidePlugin({
      _: 'lodash'
    })
  ]
};
