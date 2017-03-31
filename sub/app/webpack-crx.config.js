//
// Copyright 2016 Minder Labs.
//

const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const baseConfig = require('./webpack-base.config.js');

// TODO(burdon): Only seems to work for incremental builds?
// TODO(burdon): Could group all vendor libs via master vendor.js (that imports them).
// http://engineering.invisionapp.com/post/optimizing-webpack
// https://robertknight.github.io/posts/webpack-dll-plugins
const dll = (module) => {
  return new webpack.DllReferencePlugin({
    context: baseConfig.context,
    manifest: require('./dist/dll/' + module + '-manifest.json')
  })
};

//
// Webpack client configuration.
//

module.exports = _.merge(baseConfig, {

  target: 'web',

  cache: true,

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.github.io/docs/configuration.html#devtool
//devtool: '#eval-source-map',
  devtool: 'eval',                    // Cuts build time to 50%.

  entry: {

    background: [
      path.resolve(baseConfig.context, 'src/client/crx/background.js')
    ],

    content_script: [
      path.resolve(baseConfig.context, 'src/client/crx/content_script.js')
    ],

    browser_action: [
      path.resolve(baseConfig.context, 'src/client/crx/browser_action.js')
    ],

    sidebar: [
      path.resolve(baseConfig.context, 'src/client/crx/sidebar.js')
    ],

    options: [
      path.resolve(baseConfig.context, 'src/client/crx/options.js')
    ]
  },

  output: {
    path: path.resolve(baseConfig.context, 'dist/crx/minder/assets'),
    filename: '[name].bundle.js'
  },

  plugins: [

    // TODO(burdon): For some reason gets squashed by merge.
    // https://github.com/webpack/extract-text-webpack-plugin
    new ExtractTextPlugin('[name].css'),

    // TODO(burdon): Factor out (share across configs).
    // Pre-build vendor modules.
    // See webpack-vendor.config.js
    // dll('apollo-client'),
    // dll('lodash'),
    // dll('moment'),
    // dll('react'),
    // dll('react-dom'),
    // dll('redux'),
  ]
});
