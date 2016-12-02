//
// Copyright 2016 Minder Labs.
//

'use strict';

const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

const nodeExternals = require('webpack-node-externals');

const baseConfig = require('./webpack-base.config.js');

//
// Webpack client configuration.
//

module.exports = _.merge(baseConfig, {

  target: 'node',

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.github.io/docs/configuration.html#devtool
  devtool: '#eval-source-map',

  entry: {
    server: [
      path.resolve(baseConfig.context, 'src/server/main.js')
    ]
  },

  output: {
    path: path.resolve(baseConfig.context, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/assets/' // Path for webpack-dev-server
  },

  // TODO(burdon): Error (pulling in client dependency?) Need to separate client and server projects.
  // TODO(burdon): Different babel config?
  // Module not found: Error: Cannot resolve module 'socket.io-client/package' in /Users/burdon/projects/src/alienlaboratories/react-demos/sub/apollo/node_modules/socket.io/lib

  // externals: [
  //   'socket.io-client'
  // ]

  // externals: [nodeExternals({
  //     whitelist: [
  //       'minder-core',
  //       'minder-graphql'
  //     ]
  //   }
  // )]
});
