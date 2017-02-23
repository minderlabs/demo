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
});
