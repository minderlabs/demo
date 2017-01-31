//
// Copyright 2017 Minder Labs.
//

// TODO(burdon): Test pages (served by express).

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
      let events = this.inspect(mutations);
      if (!_.isEmpty(events)) {
        this._callback && this._callback(events);
      }
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
  isValid() {}

  /**
   * @return the CSS selector for the root of mutation changes.
   */
  getRootNode() {
    return null;
  }

  /**
   * Process the mutations.
   * @param mutations
   */
  inspect(mutations) {}
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

  inspect(mutations) {
    let events = [];

    /*
      <div id="content">
        <div>TEXT</div>
      </div>
     */

    _.each(mutations, mutation => {
      let text = $(mutation.target).text();

      // TODO(burdon): Determine if person.
      // TODO(burdon): Generate suggested query.
      events.push({
        type: 'select',
        item: {
          type: 'Person',
          title: text
        }
      });
    });

    return events;
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
    return $('.yDSKFc')[0];
  }

  inspect(mutations) {
    let events = [];

    /*
      <div data-item-id="#gmail:thread-f:1557184509751026059">
        <div role="list">
          <div data-msg-id="#msg-f:1557184509751026059">
            <div role="heading">
              <div email="">Name</div>
     */

    _.each(mutations, mutation => {

      // TODO(burdon): Get closest parent for thread ID.
      let root = $(mutation.target).find('div[data-msg-id] div[email]:first');
      if (root[0]) {
        events.push({
          type: 'select',
          item: {
            type: 'Person',
            title: root.text(),
            email: root.attr('email')
          }
        });
      }
    });

    // Remove duplicates.
    return _.uniqBy(events, 'email');
  }
}
