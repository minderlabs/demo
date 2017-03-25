//
// Copyright 2017 Minder Labs.
//

/**
 * Service providers retrieve, sync and index external data items.
 */
export class ServiceProvider {

  /**
   * @param {string} id
   * @param {string} name
   */
  constructor(id, name) {
    console.assert(id && name);
    this._id = id;
    this._name = name;
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  // TODO(burdon): How to package resources across modules.
  get icon() {}
}

/**
 * OAuth Service Provider.
 */
export class OAuthServiceProvider extends ServiceProvider {

  /**
   * @param {OAuthProvider} authProvider
   * @param {string} id
   * @param {string} name
   */
  constructor(authProvider, id, name) {
    super(id, name);
    console.assert(authProvider);
    this._authProvider = authProvider;
  }
}

/**
 * Service Registry.
 */
export class ServiceRegistry {

  constructor() {
    this._providers = new Map();
  }

  registerProvider(provider) {
    console.assert(provider);
    this._providers.set(provider.id, provider);
    return this;
  }

  get providers() {
    return Array.from(this._providers.values());
  }
}
