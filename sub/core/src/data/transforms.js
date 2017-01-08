//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

/**
 * Schema transformations (client/server).
 * Depends on graphql schema definitions.
 */
export class Transforms {

  /**
   *
   * @param object
   * @param mutations
   */
  static applyObjectMutations(object, mutations) {
    console.assert(object && mutations);

    _.each(mutations, (delta) => {
      Transforms.applyObjectMutation(object, delta);
    });

    return object;
  }

  /**
   *
   * @param object
   * @param mutation
   * @returns {*}
   */
  static applyObjectMutation(object, mutation) {
    console.assert(object && mutation);

    let field = mutation.field;
    let value = mutation.value;

    // TODO(burdon): Field dot paths (_.set/get).
    // TODO(burdon): Introspect for type-checking.

    // Null.
    if (value === undefined) {
      delete object[field];
      return;
    }

    // Array delta.
    if (value.array !== undefined) {
      object[field] = Transforms.applyArrayMutation(object[field] || [], value.array);
      return;
    }

    // Object delta.
    if (value.object !== undefined) {
      object[field] = Transforms.applyObjectMutation(object[field] || {}, value.object);
      return;
    }

    // Scalars.
    // TODO(burdon): Handle null.
    let scalar = Transforms.scalarValue(value);
    console.assert(scalar !== undefined, 'Invalid value:', value);
    object[field] = scalar;

    return object;
  }

  /**
   *
   * @param array
   * @param mutation
   */
  static applyArrayMutation(array, mutation) {
    console.assert(array && mutation);

    let scalar = Transforms.scalarValue(mutation.value);
    console.assert(scalar);

    if (mutation.index == -1) {
      _.pull(array, scalar);
    } else {
      array = _.union(array, [scalar]);
    }

    return array;
  }

  /**
   *
   * @param value
   * @returns {undefined}
   */
  static scalarValue(value) {
    let scalar = undefined;
    const scalars = ['int', 'float', 'string', 'boolean', 'id', 'date'];
    _.forEach(scalars, (s) => {
      if (value[s] !== undefined) {
        scalar = value[s];
        return false;
      }
    });

    return scalar;
  }
}
