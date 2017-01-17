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
   * Update object.
   *
   * @param object
   * @param {ObjectMutationInput} mutation
   * @returns {*}
   */
  static applyObjectMutation(object, mutation) {
    console.assert(object && mutation);

    let field = mutation.field;
    let value = mutation.value;

    // TODO(burdon): Unit tests.
    // TODO(burdon): mutation.values (see project.js)
    // TODO(burdon): Field dot paths (_.set/get).
    // TODO(burdon): Introspect for type-checking.

    // Null.
    if (value === undefined) {
      delete object[field];
      return object;
    }

    // Array delta.
    if (value.array !== undefined) {
      _.each(value.array, value => {
        object[field] = Transforms.applyArrayMutation(object[field] || [], value);
      });
      return object;
    }

    // Object delta.
    if (value.object !== undefined) {
      _.each(value.object, value => {
        object[field] = Transforms.applyObjectMutation(object[field] || {}, value);
      });
      return object;
    }

    // Scalars.
    // TODO(burdon): Handle null.
    let scalar = Transforms.scalarValue(value);
    console.assert(scalar !== undefined, 'Invalid value:', value);
    object[field] = scalar;

    return object;
  }

  /**
   * Update array.
   *
   * @param array
   * @param {ArrayMutationInput} mutation
   */
  static applyArrayMutation(array, mutation) {
    console.assert(array && mutation);

    // TODO(burdon): Handle non scalar types (i.e., recursive objects).
    let value = Transforms.scalarValue(mutation.value);
    console.assert(value);

    let match = mutation.match;
    if (match) {
      // Find existing value.
      let current = _.find(array, v => _.get(v, match.key) == Transforms.scalarValue(match.value));
      if (!current) {
        array.push({
          [match.key]: Transforms.scalarValue(match.value),
          value: value
        });
      } else {
        // TODO(burdon): For scalars replace otherwise apply value mutation.
        console.log('??????????????? MATCH');
      }
    } else if (mutation.index == -1) {
      _.pull(array, value);
    } else {
      array = _.union(array, [value]);
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
    _.each(scalars, (s) => {
      if (value[s] !== undefined) {
        scalar = value[s];
        return false;
      }
    });

    return scalar;
  }
}
