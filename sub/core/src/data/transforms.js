//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import { Matcher } from './matcher';

/**
 * Schema transformations (client/server).
 * Depends on graphql schema definitions.
 */
export class Transforms {

  // TODO(burdon): Do basic validation (e.g., check scalars are not objects).
  // TODO(burdon): Rename applyItemMutations.

  /**
   *
   * @param object
   * @param mutations
   */
  static applyObjectMutations(object, mutations) {
    console.assert(object && mutations);

    _.each(mutations, mutation => {
      Transforms.applyObjectMutation(object, mutation);
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
    let { field, value } = mutation;

    // TODO(burdon): Unit tests.
    // TODO(burdon): mutation.values (see project.js)
    // TODO(burdon): Field dot paths (_.set/get).
    // TODO(burdon): Introspect for type-checking (and field name setting).

    // Null.
    if (value === undefined) {
      delete object[field];
      return object;
    }

    // Map delta.
    if (value.map !== undefined) {
      _.each(value.map, value => {
        object[field] = Transforms.applyMapMutation(object[field] || [], value);
      });
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
    if (value.null) {
      delete object[field];
    } else {
      let scalar = Matcher.scalarValue(value);
      console.assert(scalar !== undefined, 'Invalid value:', JSON.stringify(mutation));
      object[field] = scalar;
    }

    return object;
  }

  // TODO(burdon): When replacing an object value (for a set or array), distinguish between
  // merge and replace (by default replace).

  /**
   * Update map.
   *
   * NOTE: GraphQL doesn't support maps (i.e., arbitrary keyed objects).
   * Instead we declare arrays of typed objects and use Map mutations to update them.
   * (See comment in the schema document).
   *
   * @param map
   * @param {MapMutationInput} mutation
   * @returns updated map.
   */
  static applyMapMutation(map, mutation) {
    let predicate = mutation.predicate;

    // Find the object to mutate (the object in the array that matches the predicate).
    let key = Matcher.scalarValue(predicate.value);
    let idx = _.findIndex(map, v => _.get(v, predicate.key) == key);

    // NOTE: Must be object mutation (which mutates to object matching the predicate).
    let value = mutation.value.object;
    if (value === undefined) {
      if (idx != -1) {
        // Remove.
        map.splice(idx, 1);
      }
    } else {
      if (idx == -1) {
        // Append.
        map.push(Transforms.applyObjectMutations({
          [predicate.key]: key
        }, value));
      } else {
        // Update.
        Transforms.applyObjectMutations(map[idx], value);
      }
    }

    return map;
  }

  /**
   * Update set.
   *
   * @param set
   * @param {SetMutationInput} mutation
   * @returns updated set.
   */
  static applySetMutation(set, mutation) {
    // NOTE: non-scalar sets don't make sense.
    let value = Matcher.scalarValue(mutation.value);
    console.assert(value !== undefined);

    if (mutation.add == false) {
      _.pull(set, value);
    } else {
      set = _.union(set, [value]);
    }

    return set;
  }

  /**
   * Update array.
   *
   * @param array
   * @param {ArrayMutationInput} mutation
   * @returns updated array.
   */
  static applyArrayMutation(array, mutation) {
    console.assert(array && mutation);

    // Clip range.
    let idx = Math.min(mutation.index, _.size(array) - 1);

    // TODO(burdon): Handle non scalar types?
    let value = Matcher.scalarValue(mutation.value);
    if (value === undefined) {
      array.splice(idx, 1)
    } else {
      if (idx == -1) {
        array.push(value);
      } else {
        array.splice(idx, 0, value);
      }
    }

    return array;
  }
}
