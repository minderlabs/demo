//
// Copyright 2016 Minder Labs.
//

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
      title: 'Implement simple expressions.',
      owner: 'a',
      assignee: 'b'
    },
    {
      id: 'e',
      type: 'Task',
      title: 'Implement boolean expressions.',
      owner: 'b',
      assignee: 'a'
    },
    {
      id: 'f',
      type: 'Task',
      bucket: 'a',
      title: 'Label me able.',
      labels: ['foo']
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

    // TODO(burdon): Different types!
    expect(matcher.matchItems(context, root, { ids: ['a', 'b', 'z'], type: 'Task' }, items)).to.have.length(6);
  });

  /**
   * Simple expressions.
   */
  it('Matches simple expressions.', () => {
    let matcher = new Matcher();

    let context = {};
    let root = {};

    expect(matcher.matchItems(
      context, root, { expr: { field: 'owner', value: { string: 'a' } } }, items)).to.have.length(2);
  });

  /**
   * Labels and negated labels.
   */
  it('Matches labels and negated labels.', () => {
    let matcher = new Matcher();

    let context = {};
    let root = {};

    expect(matcher.matchItem(context, root, { type: "Task", labels: ['foo'] }, items.f)).to.be.true;
    expect(matcher.matchItem(context, root, { type: "Task", labels: ['!foo'] }, items.f)).to.be.false;
    expect(matcher.matchItem(context, root, { type: "Task", labels: ['!foo'] }, items.e)).to.be.true;
  });

  /**
   * Boolean expressions.
   */
  it('Matches boolean expressions.', () => {
    let matcher = new Matcher();

    let context = {
      user: { id: 'a' }
    };
    let root = {};

    let filter = {
      expr: {
        op: 'OR',
        expr: [
          { field: 'owner',     ref: '$USER_ID' },
          { field: 'assignee',  ref: '$USER_ID' }
        ]
      }
    };

    // TODO(burdon): Implement tree.
    expect(matcher.matchItems(context, root, filter, items)).to.have.length(3);
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

  /**
   * Bucket filter.
   */
  it('Matches bucket id.', () => {
    let matcher = new Matcher();

    let context = {
      user: { id: 'a' }
    };
    let root = {};

    let filter = {
      bucket: 'a'
    };

    expect(matcher.matchItem(context, root, filter, items.f)).to.be.true;
    expect(matcher.matchItems(context, root, filter, items)).to.have.length(1);
  });
});

