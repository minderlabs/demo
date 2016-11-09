//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

// Find and run tests.
// https://github.com/webpack/karma-webpack#alternative-usage
// http://webpack.github.io/docs/context.html#require-context

var context = require.context('.', true, /^\.\/.*_test\.js$/);
console.log('TESTS:\n' + context.keys().join('\n'));
context.keys().forEach(context);
