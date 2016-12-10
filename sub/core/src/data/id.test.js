//
// Copyright 2016 Minder Labs.
//

import { ID } from './id';

describe('Data', () => {

  it('Convert between glocal to local IDs', () => {
    let globalId = ID.toGlobalId('User', 'minder');
    let { type, id } = ID.fromGlobalId(globalId);
    expect(type).to.equal('User');
    expect(id).to.equal('minder');
  });
});
