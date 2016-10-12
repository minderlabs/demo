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
      graphql: {
        files: [
          'common/data/schema.json'
        ],
        tasks: ['webpack']
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

  // https://webpack.github.io/docs/usage-with-grunt.html
  grunt.loadNpmTasks("grunt-webpack");

  grunt.registerTask('default', ['webpack']);
};
