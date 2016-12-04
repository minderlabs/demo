//
// Copyright 2016 Minder Labs.
//

'use strict';

// Find and run tests.
// https://github.com/webpack/karma-webpack#alternative-usage
// http://webpack.github.io/docs/context.html#require-context

const testsContext = require.context('.', true, /.test\.js$/);

testsContext.keys().forEach(function(path) {
  console.log('### TESTING [' + path + '] ###');
  testsContext(path);
});
