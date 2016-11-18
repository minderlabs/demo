//
// Copyright 2016 Minder Labs.
//

'use strict';

const _ = require('lodash');

const baseConfig = require('./webpack-base.config.js');

//
// Karma config.
//

module.exports = _.merge(baseConfig, {

  // More detailed but much slower (and modifies file).
  devtool: '#inline-source-map',

  // TODO(burdon): Error resolve in sinon 2?
  // https://github.com/airbnb/enzyme/issues/47
  externals: {
    'jsdom': 'window',
    'cheerio': 'window',

    'react/addons': true,
    'react/lib/ReactContext': true,
    'react/lib/ExecutionEnvironment': true
  },
});
