//
// Copyright 2016 Minder Labs.
//

const _ = require('lodash');

module.exports = _.filter(require('./webpack-base.config.js'), (conf, key) => key !== 'karma' && conf);
