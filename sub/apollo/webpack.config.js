//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

var _ = require('lodash');
const path = require('path');
const webpack = require('webpack');
const webpackLinkPlugin = require('webpack-link');

// https://github.com/webpack/extract-text-webpack-plugin
const ExtractTextPlugin = require('extract-text-webpack-plugin');

// TODO(burdon): Support symlinks.
// https://github.com/babel/babel-loader/issues/149
// https://github.com/webpack/webpack/issues/1643

//
// Webpack app configuration.
//

const BUILD_DIR = path.resolve(__dirname, 'dist');

module.exports = {

  target: 'web',

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.github.io/docs/configuration.html#devtool
  devtool: '#eval-source-map',

  entry: {
    main: [
      path.resolve(__dirname, 'src/client/main.js')
    ],

    // BABEL_NODE=hot NODE_ENV=hot
    hot: [
      // HMR client (connects to dev app server).
      'webpack/hot/dev-server',
      'webpack-hot-middleware/client',

      path.resolve(__dirname, 'src/client/main.js')
    ]
  },

  output: {
    path: BUILD_DIR,
    filename: '[name].bundle.js',

    publicPath: '/assets/' // Path for webpack-dev-server
  },

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
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, '../core/src')
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
  link: 'minder-core',

  // https://github.com/webpack/docs/wiki/list-of-plugins
  plugins: [

    new ExtractTextPlugin('[name].css'),

    // webpack --link=minder-core
    // NOTE: dependent project must have appropriate deps installed.
    // https://www.npmjs.com/package/webpack-link
    new webpackLinkPlugin({
      'minder-core': path.resolve(__dirname, '../core')
    }),

    // https://github.com/webpack/docs/wiki/list-of-plugins#hotmodulereplacementplugin
    new webpack.HotModuleReplacementPlugin(),

    new webpack.ProvidePlugin({ $: 'jquery' }),

    new webpack.ProvidePlugin({ _: 'lodash' })
  ]
};
