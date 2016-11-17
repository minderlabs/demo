//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

const webpack = require('webpack');

const webpackConfig = require('./webpack-karma.config.js');

//
// Karma configuration
// https://github.com/webpack/karma-webpack
//
// To run:
//   karma start
//

module.exports = function(config) {

  // TODO(burdon): Still termperamental (sometimes doesn't find/show tests until triggered by browser).

  config.set({

//  singleRun: true,

    autoWatch: true,

    concurrency: 1,

    logLevel: config.LOG_INFO,

    files: [
      // Support ES6 (required for phantomjs).
      'node_modules/babel-polyfill/dist/polyfill.js',

      // Test suite.
      // Specifies single bundle entry point for webpack.
      // https://github.com/webpack/karma-webpack#alternative-usage
      'src/webpack.tests.js'
    ],

    preprocessors: {
      // Transpile test suite.
      // https://github.com/webpack/karma-webpack#alternative-usage
      'src/webpack.tests.js': ['webpack']
    },

    webpack: webpackConfig,

    webpackMiddleware: {
      // https://github.com/webpack/webpack/issues/1191
      stats: {
        children: false,
        modules: false,
        chunks: false,
      }
    },

    // Browsers to run tests.
    // Override for manual testing: karma start --browsers=Chrome
    // https://npmjs.org/browse/keyword/karma-launcher
    browsers: [
      'PhantomJS'                     // Headless (ES5 only: babel transpiles ES6 code via webpack configuration).
    ],

    // https://npmjs.org/browse/keyword/karma-reporter
    reporters: [
      'progress',
      'verbose'
    ],

    frameworks: [
      'mocha',                        // Test framework https://mochajs.org
      'chai'                          // BDD assertion lib (cf. jasmine) http://chaijs.com
    ],

    client: {
      captureConsole: true,

      chai: {
        includeStack: true
      }
    },

    plugins: [
      'karma-chai',                   // https://www.npmjs.com/package/karma-chai
      'karma-mocha',                  // https://github.com/karma-runner/karma-mocha
      'karma-babel-preprocessor',     // https://github.com/babel/karma-babel-preprocessor
      'karma-phantomjs-launcher',     // https://www.npmjs.com/package/karma-phantomjs-launcher
      'karma-chrome-launcher',        // https://www.npmjs.com/package/karma-chrome-launcher
      'karma-verbose-reporter',       // https://www.npmjs.com/package/karma-verbose-reporter

      require('karma-webpack')
    ],
  });
};
