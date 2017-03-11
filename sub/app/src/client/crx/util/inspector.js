//
// Copyright 2017 Minder Labs.
//

/**
 * Registry of inspectors.
 */
export class InspectorRegistry {

  constructor() {
    this._inspectors = [];
  }

  add(inspector) {
    console.assert(inspector);
    this._inspectors.push(inspector);

    return this;
  }

  init(callback) {
    _.each(this._inspectors, inspector => {
      if (inspector.isValid()) {
        let rootNode = inspector.getRootNode();
        if (rootNode) {
          console.log('Inspector: ' + inspector.constructor.name);
          inspector.start(rootNode, callback);
        }
      }
    });

    return this;
  }
}

/**
 * Base class for DOM inspectors.
 */
class Inspector {

  constructor() {
    this._callback = null;

    // DOM mutation observer.
    // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    this._observer = new MutationObserver(mutations => {
      let context = this.inspect(mutations);
      console.log('Context: ' + JSON.stringify(context));
      this._callback && this._callback(context);
    });
  }

  start(rootNode, callback) {
    console.assert(rootNode && callback);
    this._callback = callback;

    this._observer.observe(rootNode, {
      subtree: true,
      childList: true
    });
  }

  stop() {
    this._observer.disconnect();
    this._callback = null;
  }

  /**
   * @return {boolean} Returns true if this inspector is valid.
   */
  isValid() {
    return false;
  }

  /**
   * @return the CSS selector for the root of mutation changes.
   */
  getRootNode() {
    return null;
  }

  /**
   * Process the mutations.
   * @param mutations
   * @return {object} Context object.
   */
  inspect(mutations) {
    return null;
  }
}

/**
 * Test inspector.
 */
export class TestInspector extends Inspector {

  static PATH = '/testing/crx';

  isValid() {
    return document.location.href.endsWith(TestInspector.PATH);
  }

  getRootNode() {
    return $('#content')[0];
  }

  /*
   * <div id="content">
   *   <div email="__EMAIL__">__NAME__</div>
   */
  inspect(mutations) {
    let context = null;

    _.each(mutations, mutation => {
      let root = $(mutation.target).find('> div');
      if (root[0]) {
        let name = root.text();
        let email = root.attr('email');

        // Determine type.
        let item = null;
        if (email) {
          item = {
            type: 'Person',
            title: name,
            email: email
          }
        }

        if (name) {
          context = {
            item,
            filter: {
              type: item && item.type,
              text: email || name
            }
          };

          return false;
        }
      }
    });

    return context;
  }
}

/**
 * Google Inbox inspector.
 */
export class GoogleInboxInspector extends Inspector {

  static PATH = 'https://inbox.google.com';

  isValid() {
    return document.location.href.startsWith(GoogleInboxInspector.PATH);
  }

  getRootNode() {
    // TODO(burdon): Load dynamic rules from server.
    return $('.yDSKFc')[0];
  }

  /*
   * <div data-item-id="#gmail:thread-f:1557184509751026059">
   *   <div role="list">
   *     <div data-msg-id="#msg-f:1557184509751026059">
   *       <div role="heading">
   *         <div email="__EMAIL__">__NAME__</div>
   */
  inspect(mutations) {
    let context = null;

    _.each(mutations, mutation => {

      // TODO(burdon): Get closest parent for thread ID.
      let root = $(mutation.target).find('div[data-msg-id] div[email]:first');
      if (root[0]) {
        let name = root.text();
        let email = root.attr('email');

        context = {
          item: {
            type: 'Person',
            title: name,
            email: email
          },
          filter: {
            type: 'Person',
            text: email
          }
        };

        return false;
      }
    });

    return context;
  }
}
