//
// Copyright 2016 Minder Labs.
//

import { expect } from 'chai';

import { Async } from './async';

describe('Async:', () => {

  it('sanity', (done) => {

    function multiply(value, n) {
      return new Promise((resolve, reject) => {
        resolve(value * n);
      });
    }

    let values = [1, 2, 3];

    Promise.all(_.map(values, value => multiply(value, 2)))
      .then(results => {
        expect(results).to.eql([2, 4, 6]);
        done();
      });
  });

  it('Promise chaining.', (done) => {

    const page = 10;
    const fetch = (idx, n) => {
      return new Promise((resolve, reject) => {
        resolve(_.range(idx, idx + Math.max(page, n)));
      });
    };

    const search = (count, items=undefined, idx=0) => {
      let result = [];
      return fetch(idx, count).then(items => {
        _.each(items, item => result.push(item));
        if (result.length < count) {
          return search(count - result.length, result, idx + items.length);
        }

        return items;
      });
    };

    let count = 15;
    search(count).then(items => {
      expect(items.length).to.equal(count);
      done();
    });
  });

  it('iterateWithPromises', (done) => {
    let values = [];

    // Async function.
    let f = (i) => {
      values.push(i);

      return Promise.resolve(i);
    };

    Async.iterateWithPromises(_.times(5), (i) => {
      return f(i);

    }).then((value) => {

      // Last value.
      expect(value).to.equal(4);

      // Test done sequentially.
      expect(values.length).to.equal(5);

      done();
    });
  });
});

