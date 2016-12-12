//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

/**
 * Type utils.
 */
export class TypeUtil {

  static JSON_REPLACER = (key, value) => { return _.isArray(value) ? value.length : value; };

  /**
   * Conside stringify.
   */
  static stringify = (json) => JSON.stringify(json, TypeUtil.JSON_REPLACER);

  /**
   * Formats log messages.
   * https://github.com/jonnyreeves/js-logger
   *
   * @param args
   * @param context
   */
  static LOGGING_FORMATTER = (args, context) => {
    let format = `[${context.name}] ` + args.splice(0, 1)[0];
    args.splice(0, args.length, TypeUtil.format(format, ...args));
  };

  /**
   * Clones simple JSON object.
   * @param obj
   */
  static clone(obj) {
    console.assert(obj);
    return JSON.parse(JSON.stringify(obj));
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

  /**
   * Formats the string.
   * https://developer.mozilla.org/en-US/docs/Web/API/Console#Using_string_substitutions
   *
   * @param f
   * @return {string}
   */
  static format(f) {
    let i = 1;
    let args = arguments;
    return String(f).replace(/%[sdo]/g, function(x) {
      switch (x) {
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%o': return TypeUtil.stringify(args[i++]);
        default:
          return x;
      }
    });
  }
}
