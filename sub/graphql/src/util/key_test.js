//
// Copyright 2016 Minder Labs.
//

'use strict';

import { Key } from './key';

describe('Key:', () => {

  it('Create and parse key.', () => {
    const KEY = new Key('I:{{type}}:{{itemId}}');

    let args = { type: 'User', itemId: '123' };

    let key = KEY.toKey(args);
    expect(key).to.equal('I:User:123');

    let values = KEY.fromKey(key);
    expect(_.isEqual(values, args)).to.equal(true);
  });
});
