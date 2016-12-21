//
// Copyright 2016 Minder Labs.
//

import moment from 'moment';

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
      bucket: 'a',
      type: 'Task',
      title: 'Test matcher.',
      labels: ['foo']
    }
  ], item => item.id);

  it('Compiles OK.', () => {
    expect(true).to.equal(true);
  });

  /**
   * Match buckets.
   */
  it('Matches bucket filters.', () => {
    let matcher = new Matcher();

    // TODO(burdon): console.assert is ignored by node (use node assert module?)

    let root = {};
    expect(matcher.matchItems({ user: { id: 'a' } }, root, { type: 'Task' }, items)).to.have.length(4);
    expect(matcher.matchItems({ user: { id: 'b' } }, root, { type: 'Task' }, items)).to.have.length(3);
  });

  /**
   * Bsaic filters.
   */
  it('Matches basic filters.', () => {
    let matcher = new Matcher();

    // TODO(burdon): console.assert is ignored by node (use node assert module?)

    let context = {
      user: {
        id: 'a'
      }
    };
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
   * Empty filters match nothing by default.
   */
  it('Matches nothing or everything.', () => {
    let matcher = new Matcher();

    let context = {
      user: {
        id: 'a'
      }
    };
    let root = {};

    expect(matcher.matchItems(context, root, {}, items).length).to.equal(0);
    expect(matcher.matchItems(context, root, { matchAll: true }, items).length).to.equal(_.size(items));
  });

  /**
   * Simple expressions.
   */
  it('Matches simple expressions.', () => {
    let matcher = new Matcher();

    let context = {
      user: {
        id: 'a'
      }
    };
    let root = {};

    expect(matcher.matchItems(
      context, root, { expr: { field: 'owner', value: { string: 'a' } } }, items)).to.have.length(2);
  });

  /**
   * Labels and negated labels.
   */
  it('Matches labels and negated labels.', () => {
    let matcher = new Matcher();

    let context = {
      user: {
        id: 'a'
      }
    };
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
    let filter = { bucket: 'a',
      matchAll: true
    };

    expect(matcher.matchItem(context, root, filter, items.f)).to.be.true;
    expect(matcher.matchItems(context, root, filter, items)).to.have.length(1);
  });

  /**
   * Comparators
   */
  it('Matches comparators.', () => {
    let matcher = new Matcher();

    let context = {};
    let root = {};

    let now = moment().unix();
    let anHourAgo = moment().subtract(1, 'hr').unix();

    let item1 = {
      modified: anHourAgo
    };

    expect(matcher.matchItem(context, root,
      { expr: { comp: 'GTE', field: 'modified', value: { timestamp: anHourAgo } } }, item1)).to.be.true;
    expect(matcher.matchItem(context, root,
      { expr: { comp: 'GT', field: 'modified', value: { timestamp: anHourAgo } } }, item1)).to.be.false;

    expect(matcher.matchItem(context, root,
      { expr: { comp: 'GT', field: 'modified', value: { timestamp: now } } }, item1)).to.be.false;
    expect(matcher.matchItem(context, root,
      { expr: { comp: 'GT', field: 'modified', value: { timestamp: -3600 * 2 } } }, item1)).to.be.true;
  });
});
