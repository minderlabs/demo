// Copyright 2016 Alien Laboratories, Inc.

var webpackConfig = require('./webpack.config.js');

/**
 * Grunt config.
 */
module.exports = function(grunt) {

  grunt.config.init({

    pkg: grunt.file.readJSON('package.json'),

    clean: {
      all: [
        'server/assets',
        'common/data/schema.json'
      ],
    },

    watch: {
      options: {
        atBegin: true
      },
      schema_js: {
        files: [
          'common/data/schema.js'
        ],
        tasks: ['run:update_schema']
      },
      schema_json: {
        files: [
          'common/data/schema.json'
        ],
        tasks: ['webpack']
      }
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

    // Webpack
    // NOTE: Use webpack --watch to automatically update all config entries.
    // https://webpack.github.io/docs/usage-with-grunt.html
    // https://github.com/webpack/webpack-with-common-libs/blob/master/Gruntfile.js
    webpack: {
      options: webpackConfig,
      build: {
        debug: true
      }
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

  grunt.registerTask('default', ['webpack']);
};
