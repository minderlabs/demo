//
// Copyright 2016 Minder Labs.
//

const path = require('path');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const nodeExternals = require('webpack-node-externals');
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
      'graphql'     : path.resolve('./node_modules/graphql'),
      'react'       : path.resolve('./node_modules/react'),
    }
  },

  // https://webpack.js.org/configuration/stats/#components/sidebar/sidebar.jsx
  stats: {
    assets: true,
    modules: false,

    // Suppress ExtractTextPlugin output (for each file).
    children: false,
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
          path.resolve(__dirname, '../graphql/src'),
          path.resolve(__dirname, '../services/src'),
          path.resolve(__dirname, '../ux/src'),
        ],
        options: {
          cacheDirectory: './dist/babel-cache/'
        }
      },

      // Allow direct imports of .graphql files.
      // http://dev.apollodata.com/react/webpack.html
      // https://github.com/apollostack/graphql-tag#webpack-preprocessing
      {
        test: /\.(graphql|gql)$/,
        loader: 'graphql-tag/loader',
        exclude: /node_modules/
      }
    ]
  },

  // https://www.npmjs.com/package/webpack-link
  // Comma separated list (or --link=minder-core)
  // link: 'minder-core, minder-graphql, minder-services',

  // https://github.com/webpack/docs/wiki/list-of-plugins
  plugins: [

    // Generate separate CSS files.
    // https://github.com/webpack/extract-text-webpack-plugin
    new ExtractTextPlugin('[name].css'),

    // webpackDevMiddleware imports config file.
    // https://github.com/webpack/docs/wiki/list-of-plugins#hotmodulereplacementplugin
    new webpack.HotModuleReplacementPlugin(),

    // Automatically include packages without import statement.
    new webpack.ProvidePlugin({ _: 'lodash' }),
    new webpack.ProvidePlugin({ $: 'jquery' }),
    new webpack.ProvidePlugin({ $$: 'minder-core/src/util/format' }),
    new webpack.ProvidePlugin({ Logger: 'minder-core/src/util/logger' })
  ]
};

//
// Server config.
//

const srvConfig = webpackMerge(baseConfig, {

  target: 'node',

  // https://webpack.github.io/docs/configuration.html#node
  node: {

    // Otherwise __dirname === '/'
    __dirname: false,

    // https://webpack.js.org/configuration/node
    console:  false,
    fs:       'empty',
    net:      'empty',
    tls:      'empty'
  },

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.github.io/docs/configuration.html#devtool
  devtool: '#source-map',

  entry: {
    server: [
      // This is automatically loaded when using babel-node, but required for runtime builds.
      // https://babeljs.io/docs/usage/polyfill
      'babel-polyfill',

//    path.resolve(baseConfig.context, 'src/server/sanity.js')
      path.resolve(baseConfig.context, 'src/server/server.js')
    ]
  },

  output: {
    path: path.resolve(baseConfig.context, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/assets/' // Path for webpack-dev-server
  },

  // https://www.npmjs.com/package/webpack-node-externals
  externals: [nodeExternals({
    whitelist: [
      'minder-core',
      'minder-graphql',
      'minder-services'
    ]}
  )]
});

//
// Web config.
//

const webConfig = webpackMerge(baseConfig, {

  target: 'web',

  // Source map shows original source and line numbers (and works with hot loader).
  // https://webpack.js.org/configuration/devtool/#components/sidebar/sidebar.jsx
  devtool: '#eval-source-map',

  // NOTE: entries cannot be compiled individually.
  entry: {

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

    main: [
      path.resolve(baseConfig.context, 'src/client/web/main.js')
    ],

    website: [
      path.resolve(baseConfig.context, 'src/website/site.js')
    ],

    graphiql: [
      path.resolve(baseConfig.context, 'src/graphiql/graphiql.js')
    ],

    sanity: [
      path.resolve(baseConfig.context, 'src/client/web/sanity.js')
    ]
  },

  output: {
    path: path.resolve(baseConfig.context, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/assets/' // Path for webpack-dev-server
  }
});

//
// CRX config.
//

const crxConfig = webpackMerge(baseConfig, {

  target: 'web',

  // Cuts build time to 50%.
  devtool: 'eval',

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
  }
});

//
// Multiple targets.
// https://webpack.js.org/concepts/targets/#multiple-targets
//

module.exports = {
  srv: srvConfig,
  web: webConfig,
  crx: crxConfig
};
