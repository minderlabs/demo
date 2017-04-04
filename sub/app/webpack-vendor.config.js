//
// Copyright 2016 Minder Labs.
//

const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');

const baseConfig = require('./webpack-base.config.js');

//
// Webpack client configuration.
//
// Library bundles:
// https://robertknight.github.io/posts/webpack-dll-plugins
//

module.exports = _.merge(baseConfig, {

  entry: {

    'apollo-client':  ['apollo-client'],
    'lodash':         ['lodash'],
    'moment':         ['moment'],
    'react':          ['react'],
    'react-dom':      ['react-dom'],
    'redux':          ['redux'],

  },

  output: {
    path: path.resolve(baseConfig.context, 'dist/dll/'),
    filename: '[name].bundle.js',
    library: '[name]_lib'
  },

  plugins: [
    new webpack.DllPlugin({
      path: path.resolve(baseConfig.context, 'dist/dll/[name]-manifest.json'),
      name: '[name]_lib'
    })
  ]
});
