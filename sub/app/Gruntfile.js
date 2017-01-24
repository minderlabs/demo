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

    //
    // Chrome Extension
    //

    convert: {
      yml2json: {
        // CRX manifest.
        files: [{
          src: ['src/crx/manifest.yml'],
          dest: 'dist/crx/minder/manifest.json'
        }]
      }
    },

    copy: {
      crx: {
        files: [
          {
            expand: true,
            cwd: 'src/crx',
            src: [
              'img/*',
              'page/*'
            ],
            dest: 'dist/crx/minder/'
          }
        ]
      }
    },

    // Create Chrome Extension.
    // NODE thinks this module is out of date:
    // https://github.com/oncletom/grunt-crx/issues/59
    // https://developer.chrome.com/extensions/packaging
    // NOTE: pem (private key) is created by manually packing the extension from chrome (first time only).
    // TODO(burdon): set baseURL (for auto-updates).
    crx: {
      minder: {
        options: {
          privateKey: 'src/crx/minder.pem'
        },
        src: ['dist/crx/minder/**/*'],
        dest: 'dist/crx/minder.crx'
      }
    },

    // Create CRX zip file (with PEM)
    // unzip -vl target/crx/nx.zip
    // To install (must be logged in with alienlaboratories.com account):
    // https://chrome.google.com/webstore/developer/dashboard
    // NOTE: Click Publish after upload After upload (up to 60 mins to update).
    compress: {
      crx: {
        options: {
          archive: 'dist/crx/minder.zip'
        },
        files: [
          {
            expand: true,
            cwd: 'dist/crx/minder',
            src: ['**']
          }
        ]
      }
    },

    watch: {
      options: {
        atBegin: true
      },
      crx: {
        files: [
          'src/crx/**',
          'src/client/**',
        ],
        tasks: [ 'build_crx' ]
      }
    },

    // Webpack
    // NOTE: Use webpack --watch to automatically update all config entries.
    // https://webpack.github.io/docs/usage-with-grunt.html
    // https://github.com/webpack/webpack-with-common-libs/blob/master/Gruntfile.js
    // TODO(burdon): Debug options.
    webpack: {
      crx: require('./webpack-crx.config.js')
    },
  });

  // https://github.com/gruntjs/grunt-contrib-clean
  grunt.loadNpmTasks('grunt-contrib-clean');

  // https://github.com/gruntjs/grunt-contrib-compress
  grunt.loadNpmTasks('grunt-contrib-compress');

  // https://github.com/gruntjs/grunt-contrib-copy
  grunt.loadNpmTasks('grunt-contrib-copy');

  // https://github.com/gruntjs/grunt-contrib-watch
  grunt.loadNpmTasks('grunt-contrib-watch');

  // https://www.npmjs.com/package/grunt-convert
  grunt.loadNpmTasks('grunt-convert');

  // https://www.npmjs.com/package/grunt-crx
  grunt.loadNpmTasks('grunt-crx');

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
  grunt.registerTask('build_crx', ['webpack:crx', 'convert:yml2json', 'copy:crx', 'crx:minder', 'compress:crx'])
};
