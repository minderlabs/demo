//
// Copyright 2016 Minder Labs.
//

const _ = require('lodash');
const path = require('path');

const baseConfig = require('./webpack-base.config.js');

//
// Webpack client configuration.
//
// Testing:
// npm start
// http://localhost:8080/
//

module.exports = _.merge(baseConfig, {

  target: 'web',

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.github.io/docs/configuration.html#devtool
  devtool: '#eval-source-map',

  entry: {
    test: [
      path.resolve(baseConfig.context, 'src/web/testing/test.js'),
    ]
  },

  output: {
    path: path.resolve(baseConfig.context, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/assets/' // Path for webpack-dev-server
  },
});
