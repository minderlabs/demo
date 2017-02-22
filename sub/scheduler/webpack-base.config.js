//
// Copyright 2016 Minder Labs.
//

'use strict';

const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');
const WebpackLinkPlugin = require('webpack-link');

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
      graphql: path.resolve('./node_modules/graphql')
    }
  },

  module: {

    // NPM modules
    // https://webpack.github.io/docs/configuration.html#module-loaders
    resolveLoader: {
      root: path.join(__dirname, 'node_modules')
    },

    loaders: [

      // https://github.com/webpack/json-loader
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
          path.resolve(__dirname, '../core/src'),
          path.resolve(__dirname, '../graphql/src')
        ],
        loader: 'babel-loader',

        // TODO(burdon): Unsure if has any effect.
        // http://engineering.invisionapp.com/post/optimizing-webpack/
        query: {
          cacheDirectory: true, // Important for performance.
          plugins: ['transform-regenerator'],
          presets: ['es2015', 'stage-0']
        }
      },

      // Allow direct imports of .graphql files.
      // http://dev.apollodata.com/react/webpack.html
      // https://github.com/apollostack/graphql-tag#webpack-preprocessing
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

    // webpack --link=minder-core
    // NOTE: Dependent project must have appropriate deps installed.
    // https://www.npmjs.com/package/webpack-link
    new WebpackLinkPlugin({
      'minder-core':    path.resolve(__dirname, '../core'),
      'minder-graphql': path.resolve(__dirname, '../graphql')
    }),

    new webpack.ProvidePlugin({ _: 'lodash' }),
    new webpack.ProvidePlugin({ $$: 'minder-core/src/util/format' }),
    new webpack.ProvidePlugin({ Logger: 'minder-core/src/util/logger' })
  ]
};
