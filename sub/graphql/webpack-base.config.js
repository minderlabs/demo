//
// Copyright 2016 Minder Labs.
//

'use strict';

const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');
const webpackLinkPlugin = require('webpack-link');

//
// Webpack base configuration.
//

module.exports = {

  context: __dirname,

  target: 'node',

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

      {
        test: /\.json$/,
        loader: 'json-loader'
      },

      // See .babelrc for the presets.
      // https://github.com/babel/babel-loader
      {
        test: /\.js$/,
        exclude: [/node_modules/],  // Don't transpile deps.
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, '../core/src')
        ],
        loader: 'babel-loader'
      },
    ]
  },

  // https://www.npmjs.com/package/webpack-link
  // Comma separated list (or --link=minder-core)
  link: 'minder-core',

  plugins: [

    // webpack --link=minder-core
    // NOTE: Dependent project must have appropriate deps installed.
    // https://www.npmjs.com/package/webpack-link
    // TODO(burdon): Can't trigger loader from here (must be added explicitely above).
    // https://github.com/thebeansgroup/webpack-link/issues/2
    new webpackLinkPlugin({
      'minder-core': [
        path.resolve(__dirname, '../core')
      ]
    }),

    new webpack.ProvidePlugin({ _: 'lodash' })
  ]
};
