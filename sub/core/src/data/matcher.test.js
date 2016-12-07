//
// Copyright 2016 Minder Labs.
//

'use strict';

import { Matcher } from './matcher';

describe('Matcher:', () => {

  const items = _.keyBy([
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
      title: 'Test matchers.',
      owner: 'a'
    },
    {
      id: 'd',
      type: 'Task',
      title: 'Implement predicate tree.',
      owner: 'a',
      assignee: 'b'
    }
  ], item => item.id);

  it('Compiles OK.', () => {
    expect(true).to.equal(true);
  });

  /**
   * Bsaic filters.
   */
  it('Matches basic filters.', () => {
    let matcher = new Matcher();

    // TODO(burdon): console.assert is ignored by node (use node assert module?)

    let context = {};
    let root = {};

    expect(matcher.matchItem(context, root, { type: 'User' }, items.a)).to.be.ok;
    expect(matcher.matchItem(context, root, { type: 'Task' }, items.a)).to.be.false;

    expect(matcher.matchItems(context, root, null, null)).to.have.length(0);
    expect(matcher.matchItems(context, root, null, items)).to.have.length(0);
    expect(matcher.matchItems(context, root, { type: 'User' }, items)).to.have.length(2);
    expect(matcher.matchItems(context, root, { ids: ['a', 'b', 'z'], type: 'Task' }, items)).to.have.length(4);
  });

  /**
   * Predicates.
   */
  it('Matches predicates.', () => {
    let matcher = new Matcher();

    let context = {};
    let root = {};

    expect(matcher.matchItems(context, root, { expr: { field: 'owner', value: 'a'} }, items)).to.have.length(2);
  });

  /**
   * References.
   */
  it('Matches references.', () => {
    let matcher = new Matcher();

    let context = {
      user: { id: 'a' }
    };
    let root = {
      id: 'b'
    };

    expect(matcher.matchItems(
      context, root, { expr: { field: 'owner', ref: '$USER_ID'} }, items)).to.have.length(2);

    expect(matcher.matchItems(
      context, root, { expr: { field: 'assignee', ref: 'id'} }, items)).to.have.length(1);
  });
});
