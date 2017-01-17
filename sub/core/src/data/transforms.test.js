//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { Transforms } from './transforms';

describe('Transforms:', () => {

  it('Apply object mutation.', () => {
    let object = {};

    let mutations = [{
      field: 'title',
      value: { string: 'Minder' }
    }];

    let result = Transforms.applyObjectMutations(object, mutations);
    expect(_.get(result, 'title')).to.equal('Minder');
  });

  it('Apply object mutation to remove field.', () => {
    let object = {
      title: 'Minder'
    };

    let mutations = [{
      field: 'title'
    }];

    let result = Transforms.applyObjectMutations(object, mutations);
    expect(_.get(result, 'title')).to.equal(undefined);
  });

  it('Apply nested object mutation.', () => {
    let object = {};

    let mutations = [{
      field: 'foo',
      value: {
        object: [{
          field: 'bar',
          value: {
            string: 'X'
          }
        }]
      }
    }];

    let result = Transforms.applyObjectMutations(object, mutations);
    expect(_.get(result, 'foo.bar')).to.equal('X');
  });

  it('Apply multiple object mutations.', () => {
    let object = {};

    let mutations = [{
      field: 'foo',
      value: {
        object: [{
          field: 'bar',
          value: {
            object: [{
              field: 'x',
              value: {
                object: [
                  {
                    field: 'listId',
                    value: {
                      string: 'a'
                    }
                  },
                  {
                    field: 'order',
                    value: {
                      float: 0.5
                    }
                  }
                ]
              }
            }]
          }
        }]
      }
    }];

    let result = Transforms.applyObjectMutations(object, mutations);
    expect(_.get(result, 'foo.bar.x.listId')).to.equal('a');
    expect(_.get(result, 'foo.bar.x.order')).to.equal(0.5);
  });

  it('Apply array mutation.', () => {
    let object = {
      labels: ['red', 'green']
    };

    let mutations = [
      {
        field: 'labels',
        value: {
          array: [
            { value: { string: 'blue' } },
            { value: { string: 'red' }, index: -1 }
          ]
        }
      }
    ];

    let result = Transforms.applyObjectMutations(object, mutations);
    expect(_.get(result, 'labels').length).to.equal(2);
  });

  it('Apply array match mutation.', () => {
    let object = {
      colors: [
        {
          alias: 'red',
          value: 100
        },
        {
          alias: 'blue',
          value: 200
        }
      ]
    };

    // TODO(burdon): Upsert.
    // TODO(burdon): Upsert non-scalar values (i.e., nested mutation).
    // TODO(burdon): Replace.
    // TODO(burdon): Remove.

    let mutations = [
      {
        field: 'colors',
        value: {
          array: [{
            match: {
              key: 'alias',
              value: {
                string: 'green'
              }
            },
            value: {
              int: 300
            }
          }]
        }
      }
    ];

    let result = Transforms.applyObjectMutations(object, mutations);
    let item = _.find(_.get(result, 'colors'), color => color.alias == 'green');
    expect(_.get(item, 'value')).to.equal(300);
  })
});
