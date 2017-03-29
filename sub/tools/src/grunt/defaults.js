//
// Copyright 2016 Minder Labs.
//

'use strict';

/**
 * Standard Grunt config for all modules.
 *
 * const _ = require('./node_modules/lodash/lodash');
 * const defaults = require('../tools/src/grunt/defaults');
 * grunt.config.init(_.assign(defaults.config(grount), {}));
 */
function config(grunt) {
  return {
    pkg: grunt.file.readJSON('package.json'),

    devUpdate: {
      outdated: {
        options: {
          updateType: 'report',
          semver: true,
          packages: {
            devDependencies: true,
            dependencies: true
          }
        }
      },
      update: {
        options: {
          updateType: 'force',
          semver: true,                   // Update based on current semver (i.e., only minor versions).
          packages: {
            devDependencies: true,
            dependencies: true
          }
        }
      }
    }
  }
};

/**
 * npm install --save-dev grunt-dev-update
 *
 * @param grunt
 */
function init(grunt) {

  // https://www.npmjs.com/package/grunt-dev-update
  grunt.loadNpmTasks('grunt-dev-update');

  grunt.registerTask('npm-outdated', ['devUpdate:outdated']);
  grunt.registerTask('npm-update', ['devUpdate:update']);
}

module.exports = { config, init };
