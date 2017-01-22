//
// Copyright 2016 Minder Labs.
//

/**
 * Manages key bindings.
 */
export class KeyListener {

  constructor() {
    // Map of callbacks indexed by spec.
    this._bindings = new Map();

    // Listen for key down events.
    document.addEventListener('keydown', ev => {
      this._bindings.forEach((callback, spec) => {
        let match = true;
        _.each(spec, (value, key) => {
          if (ev[key] != value) {
            match = false;
            return false;
          }
        });

        match && callback();
      });
    });
  }

  listen(spec, callback) {
    this._bindings.set(spec, callback);
    return this;
  }
}
