//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

/**
 * Type utils.
 */
export class TypeUtil {

  /**
   * Right-pad given string.
   * @param text
   * @param length
   */
  static pad(text, length) {
    let len = text ? text.length : 0;
    if (len > length) {
      text = text.substring(0, length - 3) + '...';
      len = length;
    }
    return (text || '') + _.repeat(' ', length - len);
  }

  /**
   * Truncate string.
   * @param value
   * @param len Max length (including ellipses).
   * @returns {string}
   */
  static truncate(value, len=32) {
    if (!value) {
      return '';
    }

    if (value.length > len) {
      let mid = Math.floor(len / 2);
      let left = value.substring(0, mid);
      let right = value.substring(value.length - (mid - 3));
      return left + '...' + right;
    }

    return value;
  }

  /**
   * Concise stringify.
   */
  static stringify(json, indent=0) {
    let str = JSON.stringify(json, (key, value) => {
      if (_.isArray(value)) {
        return `len(${value.length})`;
      }
      if (_.isString(value)) {
        return TypeUtil.truncate(value, 40);  // Preserve IDs.
      }
      return value;
    }, indent || 0);

    if (indent === false) {
      return str
        .replace(/[/{/}]/g, '')
        .replace(/"/g, '')
        .replace(/,/g, ' ');
    }

    return str;
  }

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
   * Flatten array that may contain arrays. Remove null/undefined values.
   * @param values
   * @returns {*}
   */
  static flattenArrays(values) {
    return _.compact([].concat.apply([], values));
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
   * Set obj.key = val if val evaluates true.
   * Returns the object.
   */
  static maybeSet(obj, path, val) {
    val && _.set(obj, path, val);
    return obj;
  }

  /**
   * Get value for key or set to default value.
   */
  static getOrSet(obj, key, defaultVal) {
    if (!obj.hasOwnProperty(key)) {
      obj[key] = defaultVal;
    }
    return obj[key];
  }

  /**
   * Iterates the collection sequentially calling the async function for each.
   *
   * @param obj
   * @param f Function to call for each key x value. (value, key/index, root)
   */
  static traverse(obj, f) {
    _.forIn(obj, (value, key) => {
      f(value, key, obj);
      if (_.isArray(value)) {
        value.forEach((el, i) => {
          f(el, i, value);
          if (_.isObject(el)) {
            TypeUtil.traverse(el, f);
          }
        });
      } else if (_.isObject(value)) {
        TypeUtil.traverse(obj[key], f);
      }
    });
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
