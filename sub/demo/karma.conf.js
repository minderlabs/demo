//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

const webpack = require('webpack');

const baseConfig = require('./webpack-karma.config.js');

//
// Karma configuration
// To run:
//   karma start
//

module.exports = function(config) {

  config.set({

    singleRun: false,

    autoWatch: true,

    logLevel: config.LOG_INFO,

    files: [
      // Support ES6 (required for phantomjs).
      'node_modules/babel-polyfill/dist/polyfill.js',

      // Test suite.
      // Specifies single bundle entry point for webpack.
      // https://github.com/webpack/karma-webpack#alternative-usage
      'testing/webpack.tests.js'
    ],

    preprocessors: {
      // Transpile test suite.
      // https://github.com/webpack/karma-webpack#alternative-usage
      'testing/webpack.tests.js': ['webpack']
    },

    webpack: baseConfig,

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
//    'Chrome',                       // Test directly in browser (click debug and view console).
      'PhantomJS'                     // Headless (ES5 only: babel transpiles ES6 code via webpack configuration).
    ],

    // https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],

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

      require('karma-webpack')
    ],
  });
};
