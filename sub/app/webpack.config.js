//
// Copyright 2016 Minder Labs.
//

'use strict';

const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

const baseConfig = require('./webpack-base.config.js');

// TODO(burdon): Migrate to v2.
// https://webpack.js.org/guides/migrating/

//
// Webpack client configuration.
//

module.exports = _.merge(baseConfig, {

  target: 'web',

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.github.io/docs/configuration.html#devtool
//devtool: '#eval-source-map',
  devtool: '#cheap-module-inline-source-map',

  entry: {

    test: [
      path.resolve(baseConfig.context, 'src/client/web/test.js')
    ],

    main: [
      path.resolve(baseConfig.context, 'src/client/web/main.js')
    ],

    hot: [
      path.resolve(baseConfig.context, 'src/client/web/main.js'),

      // BABEL_NODE=hot NODE_ENV=hot
      // HMR client (connects to dev app server).
      'webpack/hot/dev-server',
      'webpack-hot-middleware/client'
    ],

    // Testing sidebar in web page.
    hot_sidebar: [
      path.resolve(baseConfig.context, 'src/client/crx/sidebar_test.js'),

      'webpack/hot/dev-server',
      'webpack-hot-middleware/client'
    ],

    website: [
      path.resolve(baseConfig.context, 'src/website/site.js')
    ],

    graphiql: [
      path.resolve(baseConfig.context, 'src/graphiql/graphiql.js')
    ]
  },

  output: {
    path: path.resolve(baseConfig.context, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/assets/' // Path for webpack-dev-server
  },
});
