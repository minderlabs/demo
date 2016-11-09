// Copyright 2016 Alien Laboratories, Inc.

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
      ],
    },

    watch: {
      options: {
        atBegin: true
      },
      schema_js: {
        files: [
          'js/common/data/schema.js'
        ],
        tasks: [
          'run:update_schema',
        ]
      }
    },

    run: {
      update_schema: {
        cmd: 'npm',
        args: [
          'run',
          'update-schema'
        ]
      },

      webpack_server: {
        cmd: 'webpack',
        args: [
          '--config',
          'webpack-server.config.js'
        ]
      }
    },

    // Webpack
    // NOTE: Use webpack --watch to automatically update all config entries.
    // https://webpack.github.io/docs/usage-with-grunt.html
    // https://github.com/webpack/webpack-with-common-libs/blob/master/Gruntfile.js
    // TODO(burdon): Debug options.
    webpack: {
      options: {},
      client: require('./webpack.config.js')
    },
  });

  // https://github.com/gruntjs/grunt-contrib-clean
  grunt.loadNpmTasks('grunt-contrib-clean');

  // https://github.com/gruntjs/grunt-contrib-watch
  grunt.loadNpmTasks('grunt-contrib-watch');

  // https://www.npmjs.com/package/grunt-run
  grunt.loadNpmTasks('grunt-run');

  // https://webpack.github.io/docs/usage-with-grunt.html
  grunt.loadNpmTasks("grunt-webpack");

  //
  // Tasks
  //

  grunt.registerTask('default', ['build']);
  grunt.registerTask('build', ['clean', 'run:update_schema', 'webpack:client', 'run:webpack_server']);
};
