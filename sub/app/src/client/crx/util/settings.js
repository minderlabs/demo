//
// Copyright 2017 Minder Labs.
//

import { Listeners } from 'minder-core';

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
        console.log('Updated: ' + JSON.stringify(changes));

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
          this.onChange.fireListeners(this._values);
        }
      }
    });

    this.onChange = new Listeners();
  }

  /**
   * Loads the options.
   * NOTE: This doesn't trigger onChange.
   * @param trigger If true, fire update.
   * @returns {Promise}
   */
  load(trigger=false) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(this._defaults, values => {
        _.assign(this._values, values);

        resolve(values);
        if (trigger) {
          this.onChange.fireListeners(this._values);
        }
      });
    });
  }

  /**
   * Resets to defaults.
   */
  reset() {
    this._values = {};
    this._store.clear(() => {
      chrome.storage.local.set(this._defaults);
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
