//
// Copyright 2016 Minder Labs.
//

'use strict';

var _ = require('lodash');
const path = require('path');
const webpack = require('webpack');
const webpackLinkPlugin = require('webpack-link');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

//
// Webpack base configuration.
//

module.exports = {

  context: __dirname,

  resolve: {
    extensions: ['', '.js'],

    // Where to resolve imports/requires.
    modulesDirectories: [
      'node_modules'
    ],

    // Prevent multiple copies.
    // https://facebook.github.io/react/warnings/refs-must-have-owner.html#multiple-copies-of-react
    // http://stackoverflow.com/questions/31169760/how-to-avoid-react-loading-twice-with-webpack-when-developing
    alias: {
      graphql:  path.resolve('./node_modules/graphql'),
      react:    path.resolve('./node_modules/react'),
    }
  },

  module: {

    // NPM modules
    // https://webpack.github.io/docs/configuration.html#module-loaders
    resolveLoader: {
      root: path.join(__dirname, 'node_modules')
    },

    noParse: [
      'ws'
    ],

    loaders: [

      // https://github.com/webpack/json-loader
      {
        test: /\.json$/,
        loader: 'json-loader'
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
        exclude: [/node_modules/],  // Don't transpile deps.
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, '../core/src'),
          path.resolve(__dirname, '../graphql/src'),
          path.resolve(__dirname, '../ux/src')
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

  // https://www.npmjs.com/package/webpack-link
  // Comma separated list (or --link=minder-core)
  link: 'minder-core,minder-graphql',

  // https://github.com/webpack/docs/wiki/list-of-plugins
  plugins: [

    // https://github.com/webpack/extract-text-webpack-plugin
    new ExtractTextPlugin('[name].css'),

    // https://github.com/webpack/docs/wiki/list-of-plugins#hotmodulereplacementplugin
    new webpack.HotModuleReplacementPlugin(),

    // webpack --link=minder-core
    // NOTE: Dependent project must have appropriate deps installed.
    // https://www.npmjs.com/package/webpack-link
    new webpackLinkPlugin({
      'minder-core':    path.resolve(__dirname, '../core'),
      'minder-graphql': path.resolve(__dirname, '../graphql'),
      'minder-ux':      path.resolve(__dirname, '../ux')
    }),

    new webpack.ProvidePlugin({ _: 'lodash' }),
    new webpack.ProvidePlugin({ $: 'jquery' }),
    new webpack.ProvidePlugin({ $$: 'minder-core/src/util/format' }),
    new webpack.ProvidePlugin({ Logger: 'minder-core/src/util/logger' })
  ]
};
