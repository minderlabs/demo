//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

/**
 * Type utils.
 */
export class TypeUtil {

  /**
   * Concise stringify.
   */
  static stringify = (json, indent) => JSON.stringify(json, (key, value) => {
    if (_.isArray(value)) {
      return `len(${value.length})`;
    }
    if (_.isString(value) && value.length > 32) {
      return value.substring(0, 32) + '...';
    }
    return value;
  }, indent);

  /**
   * Return true if value is effectively empty (i.e., undefined, null, [], or {} values).
   * @param value
   */
  static isEmpty(value) {
    return _.isNil(value) || (_.isObject(value) && _.isEmpty(TypeUtil.compact(value)));
  }

  /**
   * Clones simple JSON object.
   * @param obj
   */
  static clone(obj) {
    console.assert(obj);
    // TODO(burdon): Consider _.cloneDeep?
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Remove empty fields from object.
   * @param value
   */
  static compact(value) {
    return _.omitBy(value, v => _.isNil(v)    // Null/undefined scalar.
      || (_.isString(v) && _.isEmpty(v))      // Empty string.
      || (_.isObject(v) && _.isEmpty(v)));    // Empty array/object.
  }

  /**
   * Multimap.
   * @param map
   * @param key
   * @param def
   * @returns {*}
   */
  static defaultMap(map, key, def=Map) {
    let value = map.get(key);
    if (value === undefined) {
      value = new def();
      map.set(key, value);
    }

    return value;
  }

  /**
   * Appends non-null values to array.
   * @param array
   * @param value Value or array of values.
   */
  static maybeAppend(array, value) {
    if (!_.isEmpty(value)) {
      if (_.isNil(array)) {
        array = [];
      }

      if (_.isArray(value)) {
        _.each(value, v => array.push(v));
      } else {
        array.push(value);
      }
    }

    return array;
  }

  /**
   * Iterates the collection sequentially calling the async function for each.
   *
   * @param collection Data to iterate.
   * @param func Returns a value or promise.
   * @return {Promise}
   */
  static iterateWithPromises(collection, func) {
    let p = Promise.resolve();

    _.each(collection, (...args) => {
      p = p.then(() => {
        return Promise.resolve(func.apply(null, args));
      });
    });

    // Resolve after each item in the sequence resolves.
    return p;
  }
}

/**
 * Dynamic value provider.
 */
export class Provider {

  get value() {}
}

/**
 * Dyamically returns the give property from the object.
 * new PropertyProvider({ foo: { bar: 100 } }, 'foo.bar').value == 100;
 */
export class PropertyProvider extends Provider {

  constructor(object, property) {
    super();
    console.assert(object && property);

    this._object = object;
    this._property = property;
  }

  get value() {
    return _.get(this._object, this._property);
  }
}

/**
 * Wraps a read-only object. Allows for dynamic access of values.
 */
export class Wrapper {

  constructor(object) {
    console.assert(object);
    this._object = object;
  }

  value(property, defaultValue) {
    return _.get(this._object, property, defaultValue);
  }
}
