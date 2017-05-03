//
// Copyright 2016 Minder Labs.
//

const path = require('path');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

//
// Webpack base configuration.
//

const baseConfig = {

  context: __dirname,

  // https://webpack.js.org/configuration/resolve
  resolve: {

    // Resolve imports/requires.
    modules: [
      'node_modules'
    ],

    extensions: ['.js'],

    // Prevent multiple copies (from npm link).
    // https://facebook.github.io/react/warnings/refs-must-have-owner.html#multiple-copies-of-react
    // http://stackoverflow.com/questions/31169760/how-to-avoid-react-loading-twice-with-webpack-when-developing
    alias: {
      'react' : path.resolve('./node_modules/react')
    }
  },

  module: {

    rules: [

      // https://github.com/webpack/json-loader
      {
        test: /\.json$/,
        use: [{
          loader: 'json-loader'
        }]
      },

      // See .babelrc for the presets.
      // https://github.com/babel/babel-loader
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,    // Don't transpile deps.
        include: [
          path.resolve('src'),
          path.resolve(__dirname, '../core/src'),
        ],
        options: {
          cacheDirectory: './dist/babel-cache/'
        }
      },

      // https://github.com/webpack/css-loader
      {
        test: /\.css$/,
        use: [{
          loader: 'css-loader'
        }]
      },

      // https://github.com/webpack/less-loader
      {
        test: /\.less$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'less-loader']
        })
      }
    ]
  },

  // https://github.com/webpack/docs/wiki/list-of-plugins
  plugins: [

    // https://github.com/webpack/extract-text-webpack-plugin
    new ExtractTextPlugin('[name].css'),

    // https://github.com/webpack/docs/wiki/list-of-plugins#hotmodulereplacementplugin
    new webpack.HotModuleReplacementPlugin(),

    new webpack.ProvidePlugin({ _: 'lodash' }),
    new webpack.ProvidePlugin({ $: 'jquery' }),
    new webpack.ProvidePlugin({ $$: 'minder-core/src/util/format' }),
    new webpack.ProvidePlugin({ Logger: 'minder-core/src/util/logger' })
  ]
};
//
// Web config.
//

const webConfig = webpackMerge(baseConfig, {

  target: 'web',

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.github.io/docs/configuration.html#devtool
  devtool: '#source-map',

  entry: {
    components: [
      path.resolve(baseConfig.context, 'src/web/testing/components.js'),
    ],

    test_apollo: [
      path.resolve(baseConfig.context, 'src/web/testing/apollo/main.js'),
    ]
  },

  output: {
    path: path.resolve(baseConfig.context, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/assets/' // Path for webpack-dev-server
  }
});

module.exports = webConfig;
