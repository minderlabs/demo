//
// Copyright 2016 Minder Labs.
//

'use strict';

import { Matcher } from './matcher';

describe('Matcher:', () => {

  it('Compiles OK.', () => {
    expect(true).to.equal(true);
  });

  it('Matches.', () => {
    let matcher = new Matcher();

    let items = _.keyBy([
      {
        id: 'a',
        type: 'User',
        title: 'Alice Braintree'
      },
      {
        id: 'b',
        type: 'User',
        title: 'Minder Admin'
      },
      {
        id: 'c',
        type: 'Task',
        title: 'Test matchers.'
      },
      {
        id: 'd',
        type: 'Task',
        title: 'Implement predicate tree.',
        owner: 'b',
        assignee: 'a'
      }
    ], item => item.id);

    expect(matcher.matchItem({ type: 'User' }, items.a)).to.be.ok;
    expect(matcher.matchItem({ type: 'Task' }, items.a)).to.be.false;

    expect(matcher.matchItems(null, null)).to.have.length(0);
    expect(matcher.matchItems(null, items)).to.have.length(0);
    expect(matcher.matchItems({ type: 'User' }, items)).to.have.length(2);
    expect(matcher.matchItems({ ids: ['a', 'b', 'z'], type: 'Task' }, items)).to.have.length(4);
  });
});
