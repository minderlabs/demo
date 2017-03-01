//
// Copyright 2016 Minder Labs.
//

import { TypeUtil } from './type';

describe('TypeUtil:', () => {

  it('defaultMap', () => {
    let map = new Map();
    TypeUtil.defaultMap(map, 'a', Array).push('x');
    TypeUtil.defaultMap(map, 'a', Array).push('y');
    expect(map.get('a')).to.have.lengthOf(2);
  });

  it('isEmpty', () => {
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

  it('traverse', () => {
    let obj = {
      a: {
        b: {
          c: [
            {
              value: { id: 100 }
            },
            {
              value: { id: 200 }
            }
          ]
        }
      }
    };

    let x = [];
    TypeUtil.traverse(obj, (value, key) => {
      let id = _.get(value, 'value.id');
      if (id) {
        x.push(id);
      }
    });

    expect(x).to.have.lengthOf(2);
  });
});
