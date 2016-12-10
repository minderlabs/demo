//
// Copyright 2016 Minder Labs.
//

// TODO(burdon): Not running karma/webpack.
const expect = require('chai').expect;

// TODO(burdon): ERROR
// SyntaxError: Cannot declare a parameter named 'error' in strict mode

import { TypeUtil } from 'minder-core';

// import { Randomizer } from './testing/randomizer';    // OK
// import { graphqlLogger } from './util/logger';        // Bad => core

// TODO(burdon): Create karma tests for core.

describe('Sanity:', () => {

  it('Is sane.', () => {
    expect(true).to.be.ok;
  });

  it('It waits for async functions.', (done) => {

    async function test(promise, value) {
      let result = await promise;

      // This waits for the value.
      expect(result).to.equal(value);
      return result;
    }

    function doAsync(value) {
      return new Promise((resolve, reject) => {
        resolve(value);
      });
    }

    let result = test(doAsync(100), 100);

    // Still a promise here.
    // NOTE: Just does fancy rewriting.
    result.then((value) => {
      expect(value).to.equal(100);
      done();
    });
  })
});
