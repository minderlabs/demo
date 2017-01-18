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

  it('Apply set mutation.', () => {
    let object = {
      labels: ['red', 'green']
    };

    let mutations = [
      {
        field: 'labels',
        value: {
          set: [
            { value: { string: 'blue' } },
            { value: { string: 'blue' } },
            { value: { string: 'red' }, add: false }
          ]
        }
      }
    ];

    let result = Transforms.applyObjectMutations(object, mutations);
    expect(_.get(result, 'labels').length).to.equal(2);
    expect(_.findIndex(_.get(result, 'labels'), 'red')).to.equal(-1);
    expect(_.indexOf(_.get(result, 'labels'), 'green')).to.not.equal(-1);
    expect(_.indexOf(_.get(result, 'labels'), 'blue')).to.not.equal(-1);
  });

  it('Apply array mutation.', () => {
    let object = {
      scores: [1, 2, 3]
    };

    let mutations = [
      {
        field: 'scores',
        value: {
          array: [
            { value: { null: true }, index: 1 },    // Remove
            { value: { int: 1 }, index: -1 },       // Append
            { value: { int: 2 }, index: 0 }         // Prepend
          ]
        }
      }
    ];

    let result = Transforms.applyObjectMutations(object, mutations);
    expect(_.get(result, 'scores').length).to.equal(4);
  });

  it('Apply array map mutation.', () => {
    let object = {
      colors: [
        {
          alias: 'red',
          labels: ['a', 'b', 'c']
        },
        {
          alias: 'blue'
        }
      ]
    };

    // TODO(burdon): Upsert non-scalar values (i.e., nested mutation).

    let mutations = [
      {
        field: 'colors',
        value: {
          array: [
            {
              // Update existing.
              map: {
                key: 'alias',
                value: {
                  string: 'red'
                }
              },
              value: {
                object: [{
                  field: 'labels',
                  value: {
                    set: [{ value: { string: 'd' } }]
                  }
                }]
              }
            },
            {
              // Insert new element.
              map: {
                key: 'alias',
                value: {
                  string: 'green'
                }
              },
              value: {
                object: [{
                  field: 'labels',
                  value: {
                    set: [{ value: { string: 'x' } }]
                  }
                }, {
                  field: 'labels',
                  value: {
                    set: [{ value: { string: 'y' } }]
                  }
                }]
              }
            },
            {
              // Remove
              map: {
                key: 'alias',
                value: {
                  string: 'blue'
                }
              },
              value: {
                null: true
              }
            }
          ]
        }
      }
    ];

    let result = Transforms.applyObjectMutations(object, mutations);

    expect(_.get(_.find(_.get(result, 'colors'), color => color.alias == 'red'), 'labels')).to.have.length(4);
    expect(_.get(_.find(_.get(result, 'colors'), color => color.alias == 'green'), 'labels')).to.have.length(2);
    expect(_.findIndex(_.get(result, 'colors'), color => color.alias == 'blue')).to.equal(-1);
  });

  /*
  it('Apply array map mutation with object values.', () => {
    let object = {
      emails: [
        {
          alias: 'home',

        },
        {
          alias: 'work',
        }
      ]
    }
  });
  */
});
