//
// Copyright 2016 Minder Labs.
//

'use strict';

/**
 * Grunt config.
 */
module.exports = function(grunt) {

  grunt.config.init({

    pkg: grunt.file.readJSON('package.json'),

    clean: {
      all: [
        'dist'
      ]
    },

    run: {
      update_schema: {
        cmd: 'npm',
        args: [
          'run',
          'update-schema'
        ]
      }
    },

    // Version: "grunt version:client:patch" (to inc version).
    version: {
      options: {
        // Match both ["version": "0.0.1"] and [__version__ = '0.0.1']
        prefix: '[^\\-]((version)|(VERSION))[\'"]?[_\\s]*[:=]\\s*[\'"]'
      },
      client: {
        options: {
          release: 'patch'
        },
        src: [
          'src/common/defs.js'
        ]
      }
    },

    // Webpack
    // NOTE: Use webpack --watch to automatically update all config entries.
    // https://webpack.github.io/docs/usage-with-grunt.html
    // https://github.com/webpack/webpack-with-common-libs/blob/master/Gruntfile.js
    // TODO(burdon): Debug options.
    webpack: {
      client: require('./webpack.config.js')
    },
  });

  // https://github.com/gruntjs/grunt-contrib-clean
  grunt.loadNpmTasks('grunt-contrib-clean');

  // https://github.com/gruntjs/grunt-contrib-watch
  grunt.loadNpmTasks('grunt-contrib-watch');

  // https://www.npmjs.com/package/grunt-run
  grunt.loadNpmTasks('grunt-run');

  // https://www.npmjs.com/package/grunt-version
  grunt.loadNpmTasks('grunt-version');

  // https://webpack.github.io/docs/usage-with-grunt.html
  grunt.loadNpmTasks("grunt-webpack");

  //
  // Tasks
  //

  grunt.registerTask('default', ['build']);
  grunt.registerTask('build', ['clean', 'run:update_schema', 'webpack']);
};
