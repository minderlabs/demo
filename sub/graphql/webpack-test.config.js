//
// Copyright 2016 Minder Labs.
//
// Webpack Mocha configuration
// https://webpack.github.io/docs/configuration.html
// https://www.npmjs.com/package/mocha-webpack
//

'use strict';

const _ = require('lodash');

// TODO(burdon): Error: Cannot resolve module 'hiredis' (can't resolve node_modules/redis-commands/commands.json)
// https://github.com/webpack/webpack/issues/1302
// https://github.com/webpack/webpack-dev-server/issues/227
// https://github.com/NodeRedis/node_redis/issues/790 [Added question/comment]
const nodeExternals = require('webpack-node-externals');

const baseConfig = require('./webpack-base.config.js');

//
// Webpack karma configuration.
//

module.exports = _.merge(baseConfig, {

  // https://www.npmjs.com/package/webpack-node-externals
  // http://jlongster.com/Backend-Apps-with-Webpack--Part-I
  externals: [nodeExternals({
    whitelist: ['minder-core']
  })],
});
