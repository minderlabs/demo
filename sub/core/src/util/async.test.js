//
// Copyright 2016 Minder Labs.
//

describe('Async:', () => {

  it('Promise chaining', (done) => {

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
});

