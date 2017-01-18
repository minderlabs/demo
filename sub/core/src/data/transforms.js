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

    // Set delta.
    if (value.set !== undefined) {
      _.each(value.set, value => {
        object[field] = Transforms.applySetMutation(object[field] || [], value);
      });
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

  // TODO(burdon): When replacing an object value (for a set or array), distinguish between
  // merge and replace (by default replace).

  /**
   * Update set
   *
   * @param set
   * @param mutation
   * @returns {*}
   */
  static applySetMutation(set, mutation) {
    // NOTE: non-scalar sets don't make sense.
    let value = Transforms.scalarValue(mutation.value);
    console.assert(value !== undefined);

    if (mutation.add == false) {
      _.pull(set, value);
    } else {
      set = _.union(set, [value]);
    }

    return set;
  }

  // TODO(burdon): Update label mutations to use this.

  /**
   * Update array.
   *
   * @param array
   * @param {ArrayMutationInput} mutation
   */
  static applyArrayMutation(array, mutation) {
    console.assert(array && mutation);

    let map = mutation.map;
    if (map) {

      //
      // Match mutations treat arrays like keyed maps (since there is no way other way to represent objects in GraphQL.
      // TODO(burdon): Is this true? can fields be objects? (Even if they can, then fields can't be declared in query?)
      //

      // Find the object to mutate.
      let mapValue = Transforms.scalarValue(map.value);
      let idx = _.findIndex(array, v => _.get(v, map.key) == mapValue);

      // TODO(burdon): Must be object mutation (applied to object matching map key).
      let value = mutation.value.object;
      if (value === undefined) {
        if (idx != -1) {
          // Remove.
          array.splice(idx, 1);
        }
      } else {
        if (idx == -1) {
          // Append.
          array.push(Transforms.applyObjectMutations({
            [map.key]: mapValue
          }, value));
        } else {
          // Update.
          Transforms.applyObjectMutations(array[idx], value);
        }
      }
    } else {

      //
      // Index based value.
      //

      let idx = Math.min(mutation.index, _.size(array) - 1);

      // TODO(burdon): Handle non scalar types?
      let value = Transforms.scalarValue(mutation.value);
      if (value === undefined) {
        array.splice(idx, 1)
      } else {
        if (idx == -1) {
          array.push(value);
        } else {
          array.splice(idx, 0, value);
        }
      }
    }

    return array;
  }

  /**
   * Get the scalar value if set.
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
