// Copyright 2016 Alien Laboratories, Inc.

/**
 * Grunt config.
 */
module.exports = function(grunt) {

  grunt.config.init({

    pkg: grunt.file.readJSON('package.json'),

    clean: {
      all_pyc: ['src/main/python/**/*.pyc']
    },

    // Python tests.
    nose: {
      options: {
        stop: true,
        virtualenv: 'tools/python',
        config: 'nose.cfg'
      },
      tests: {}
    },
  });

  // https://github.com/gruntjs/grunt-contrib-clean
  grunt.loadNpmTasks('grunt-contrib-clean');

  // https://github.com/gruntjs/grunt-contrib-watch
  grunt.loadNpmTasks('grunt-contrib-watch');

  // https://www.npmjs.org/package/grunt-nose
  grunt.loadNpmTasks('grunt-nose');

  // https://www.npmjs.com/package/grunt-run
  grunt.loadNpmTasks('grunt-run');

  grunt.registerTask('default', ['webpack']);
};
