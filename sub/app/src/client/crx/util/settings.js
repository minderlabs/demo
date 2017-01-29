//
// Copyright 2017 Minder Labs.
//

/**
 * Chrome store abstraction.
 */
export class Settings {

  /**
   * Wrapper for chrome store.
   * @param defaults
   */
  constructor(defaults=undefined) {

    // Default options (specify all keys).
    this._defaults = defaults || {};

    // https://developer.chrome.com/extensions/storage
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API#localStorage
    this._store = chrome.storage.local;

    // Cached values.
    this._values = {};

    // Change listener.
    this._onChange = null;

    // TODO(burdon): 'sync' across machines.
    // https://developer.chrome.com/extensions/storage#event-onChanged
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName == 'local') {
        // Update changes.
        _.each(changes, (value, key) => {
          if (value.newValue) {
            _.assign(this._values, { [key]: value.newValue });
          } else {
            _.unset(this._values, key);
          }
        });

        // Don't update after reset.
        if (!_.isEmpty(this._values)) {
          this.fireUpdate();
        }
      }
    });
  }

  fireUpdate() {
    console.log('Updated: ' + JSON.stringify(this._values));
    this._onChange && this._onChange(this._values);
  }

  /**
   * Listens for changes.
   * @param {Function} onChange
   */
  onChange(onChange) {
    this._onChange = onChange;
    return this;
  }

  /**
   * Loads the options.
   * NOTE: This doesn't trigger onChange.
   * @returns {Promise}
   */
  load() {
    console.log('Loading...');
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(this._defaults, values => {
        _.assign(this._values, values);
        resolve(values);
      });
    });
  }

  /**
   * Resets to defaults.
   */
  reset() {
    this._values = {};
    this._store.clear(() => {
      return this.load().then(values => this.fireUpdate());
    });
  }

  /**
   * Sets the names property
   * @param {string} property
   * @param value If undefined, removes the property.
   */
  set(property, value=undefined) {
    if (value === undefined) {
      chrome.storage.local.remove(property);
    } else {
      chrome.storage.local.set({ [property]: value });
    }
  }

  /**
   * Gets read-only values.
   * @returns {object}
   */
  get values() {
    return this._values;
  }
}
