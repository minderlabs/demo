//
// Copyright 2016 Minder Labs.
//

const _ = require('lodash');

const defs = require('./webpack-defs.config.js');

// Build everything.
module.exports = _.map(defs);
