//
// Copyright 2016 Minder Labs.
//

'use strict';

// TODO(burdon): Not running karma/webpack.
const expect = require('chai').expect;

// TODO(burdon): ERROR
// SyntaxError: Cannot declare a parameter named 'error' in strict mode

import { TypeUtil } from 'minder-core';

// import { Randomizer } from './testing/randomizer';    // OK
// import { graphqlLogger } from './util/logger';        // Bad => core

// TODO(burdon): Create karma tests for core.

describe('Sanity', () => {

  it('IS SANE', () => {
    expect(true).to.be.ok;
  });
});
