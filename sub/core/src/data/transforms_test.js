//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import { Transforms } from './transforms';

describe('Transforms', () => {

  it('Apply object mutation.', () => {
    let object = {};

    let deltas = [{
      field: 'title',
      value: { string: 'Minder' }
    }];

    let result = Transforms.applyObjectMutations(object, deltas);
    expect(_.get(result, 'title')).to.equal('Minder');
  });

  it('Apply object mutation to remove field.', () => {
    let object = {
      title: 'Minder'
    };

    let deltas = [{
      field: 'title'
    }];

    let result = Transforms.applyObjectMutations(object, deltas);
    expect(_.get(result, 'title')).to.equal(undefined);
  });

  it('Apply array mutation.', () => {
    let object = {
      labels: ['red', 'green']
    };

    let deltas = [
      {
        field: 'labels',
        value: { array: { value: { string: 'blue' } } }
      },
      {
        field: 'labels',
        value: { array: { index: -1, value: { string: 'red' } } }
      }
    ];

    let result = Transforms.applyObjectMutations(object, deltas);
    expect(_.get(result, 'labels').length).to.equal(2);
  });
});
