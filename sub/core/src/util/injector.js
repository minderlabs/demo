//
// Copyright 2016 Minder Labs.
//

/**
 * Simple dependency injector.
 */
export class Injector {

  /**
   * Provides class instance.
   * @param instance
   * @returns {{}}
   */
  static provider(instance) {
    console.assert(_.isObject(instance));
    let module = {};
    // TODO(burdon): Disambiguate class names.
    module[instance.constructor.name] = instance;
    return module;
  }

  constructor(modules) {
    this._keys = new Map();

    _.each(modules, module => {
      console.assert(_.isObject(module));
      _.each(module, (value, key) => {
        console.log('Key: %s', key);
        this._keys.set(key, value);
      });
    });
  }

  get(key) {
    if (_.isObject(key)) {
      let value = this._keys.get(key.name);
      console.assert(value, 'Missing key: %s', key);
      return value;
    }
  }
}
