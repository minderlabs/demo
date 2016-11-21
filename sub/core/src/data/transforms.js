//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

/**
 * Schema transformations (client/server).
 * Depends on graphql schema definitions.
 */
export class Transforms {

  /**
   *
   * @param object
   * @param deltas
   */
  static applyObjectDeltas(object, deltas) {
    console.assert(object && deltas);

    _.each(deltas, (delta) => {
      Transforms.applyObjectDelta(object, delta);
    });

    return object;
  }

  /**
   *
   * @param object
   * @param delta
   * @returns {*}
   */
  static applyObjectDelta(object, delta) {
    console.assert(object && delta);

    let field = delta.field;
    let value = delta.value;

    // TODO(burdon): Field dot paths (_.set/get).
    // TODO(burdon): Introspect for type-checking.

    // Null.
    if (value === undefined) {
      delete object[field];
      return;
    }

    // Array delta.
    if (value.array !== undefined) {
      object[field] = Transforms.applyArrayDelta(object[field] || [], value.array);
      return;
    }

    // Object delta.
    if (value.object !== undefined) {
      object[field] = Transforms.applyObjectDelta(object[field] || {}, value.object);
      return;
    }

    // Scalars.
    let scalar = Transforms.scalarValue(value);
    console.assert(scalar);
    object[field] = scalar;

    return object;
  }

  /**
   *
   * @param array
   * @param delta
   */
  static applyArrayDelta(array, delta) {
    console.assert(array && delta);

    let scalar = Transforms.scalarValue(delta.value);
    console.assert(scalar);

    if (delta.index == -1) {
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
