//
// Copyright 2016 Minder Labs.
//

import { TypeUtil } from './type';

describe('Types:', () => {

  it('Iterator of promises.', (done) => {
    let values = [];

    // Async function.
    let f = (i) => {
      values.push(i);

      return Promise.resolve(i);
    };

    TypeUtil.iterateWithPromises(_.times(5), (i) => {
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
