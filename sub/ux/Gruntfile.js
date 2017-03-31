//
// Copyright 2016 Minder Labs.
//

'use strict';

const _ = require('./node_modules/lodash/lodash');
const defaults = require('../tools/src/grunt/defaults');

/**
 * Grunt config.
 */
module.exports = function(grunt) {

  defaults.init(grunt);

  grunt.config.init(_.assign(defaults.config(grunt), {
  }));

  //
  // Tasks
  //
};
