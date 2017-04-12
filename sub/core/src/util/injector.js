//
// Copyright 2016 Minder Labs.
//

/**
 * Simple dependency injector.
 */
export class Injector {

  /**
   * Provides class instance.
   * @param {object} instance
   * @param {string} key [optional]
   * @returns {{}}
   */
  static provide(instance, key=undefined) {
    console.assert(_.isObject(instance), 'Invalid provider: ', { instance, key });

    if (!key) {
      key = instance.constructor.name;
    }

    console.assert(key, 'Invalid key: ' + key);
    return {
      [key]: instance
    };
  }

  constructor(modules) {
    this._objects = new Map();

    _.each(modules, module => {
      console.assert(_.isObject(module));

      _.each(module, (value, key) => {
        this._objects.set(key, value);
      });
    });
  }

  /**
   * Gets the injected value.
   * @param {string|object} key
   * @return {*}
   */
  get(key) {
    console.assert(key);

    let value = null;
    if (_.isString(key)) {
      value = this._objects.get(key);
    } else if (_.isObject(key)) {
      value = this._objects.get(key.name);
    }

    console.assert(value, 'Missing key: %s', key);
    return value;
  }
}
