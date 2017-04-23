//
// Copyright 2016 Minder Labs.
//

'use strict';

const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

//
// Client
//

const clientConfig = {

  target: 'web',

  devtool: '#eval-source-map',

  entry: {
    web: [
      path.resolve(__dirname, 'src/client/web.js')
    ]
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/assets/'
  },

  resolve: {
    alias: {
      'bootstrap-css': path.join(__dirname, 'node_modules/bootstrap/dist/css/bootstrap.css'),
    }
  },

  module: {
    rules: [
      // Bootstrap 3 glyph issue.
      // https://github.com/webpack-contrib/css-loader/issues/38
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: 'url-loader'
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader'
          },
          {
            loader: 'css-loader'
          }
        ]
      },
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract({
          fallbackLoader: "style-loader",
          loader: "css-loader!less-loader",
        }),
      },
      {
        test: /\.js$/,
        exclude: /node_modules/, // Don't transpile deps.
        include: [
          path.resolve(__dirname, 'src')
        ],
        loader: 'babel-loader',
      }
    ]
  },

  plugins: [
    new ExtractTextPlugin('[name].css'),
    new webpack.ProvidePlugin({ _: 'lodash' }),
    new webpack.ProvidePlugin({ $: 'jquery' })
  ]
};

//
// Server
//

const serverConfig = {

  target: 'node',

  devtool: '#eval-source-map',

  entry: {
    server: [
      path.resolve(__dirname, 'src/server/server.js')
    ]
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js'
  }
};

//
// Combined
// https://webpack.js.org/concepts/configuration/#multiple-targets
// https://webpack.js.org/concepts/targets/#multiple-targets
//

module.exports = [ clientConfig, serverConfig ];
