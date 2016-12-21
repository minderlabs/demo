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

  it('Append to array.', () => {
    let values = [1, 2, 3];
    let result = TypeUtil.append(values, [4, 5]);
    expect(result.length).to.equal(5);
  });

  it('Determines if empty.', () => {
    expect(TypeUtil.isEmpty()).to.be.true;
    expect(TypeUtil.isEmpty({})).to.be.true;
    expect(TypeUtil.isEmpty([])).to.be.true;
    expect(TypeUtil.isEmpty(null)).to.be.true;
    expect(TypeUtil.isEmpty({ foo: undefined })).to.be.true;
    expect(TypeUtil.isEmpty({ foo: [] })).to.be.true;
    expect(TypeUtil.isEmpty({ foo: {} })).to.be.true;

    expect(TypeUtil.isEmpty([1])).to.be.false;
    expect(TypeUtil.isEmpty({ foo: 1 })).to.be.false;
  });
});
