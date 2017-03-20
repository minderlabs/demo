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

  /**
   * Select and initialize inspectors.
   * @param callback
   * @returns {InspectorRegistry}
   */
  init(callback) {

    // TODO(burdon): Wait for load. Match URL and dynamically find root each time.
    setTimeout(() => {
      _.each(this._inspectors, inspector => {
        if (inspector.isValid()) {
          // FIXME: change the interace -- two passes of state:
          // 1) state = getPageState() -- at page load time (equiv of getRootNode now) (and callback(context) once)
          //   ---> { context, rootNode }
          // 2) start(state, callback) -- start listening for mutations,
          let { context, rootNode } = inspector.getPageState();
          if (context) {
            callback(context);
          }
          if (rootNode) {
            console.log('Inspector: ' + inspector.constructor.name);
            inspector.start(rootNode, callback);
          }
        }
      });
    }, 1000);

    return this;
  }
}

/**
 * Base class for DOM inspectors.
 *
 * TODO(burdon): Make declarative and load dynamic rules from server.
 */
class Inspector {

  constructor() {
    this._callback = null;

    // DOM mutation observer.
    // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    this._observer = new MutationObserver(mutations => {
      let context = this.inspect(mutations);
      console.log('Context: ' + JSON.stringify(context));
      if (this._callback && context) {
        this._callback(context);
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
  isValid() {
    return false;
  }

  /**
   *
   * @return {{context, rootNode}}
   */
  getPageState() {
    return {
      context: this.getInitialContext(),
      rootNode: this.getRootNode()
    }
  }

  getInitialContext() {
    return null;
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
        if (name && email) {
          context = {
            items: [{
              type: 'Contact',
              title: name,
              email: email
            }]
          };

          return false;
        }
      }
    });

    return context;
  }
}

/**
 * Gmail
 */
export class GmailInspector extends Inspector {

  static PATH = 'https://mail.google.com';

  isValid() {
    return document.location.href.startsWith(GmailInspector.PATH);
  }

  getRootNode() {
    return $('div[role="main"]')[0];
  }

  /*
   * <div role="main">
   *   <table role="presentation">
   *     <div role="list">
   *       <div role="listitem">
   *         <h3 class="iw">
   *           <span email="__EMAIL__" name="__NAME__">__NAME__</span>
   */
  inspect(mutations) {
    let context = null;

    _.each(mutations, mutation => {

      // TODO(burdon): Get closest parent for thread ID.
//    let root = $(mutation.target).find('div[role="listitem"] h3 span');
      let root = $('div[role="main"] div[role="listitem"] h3 span');
      if (root[0]) {
        let name = root.text();
        let email = root.attr('email');
        if (name && email) {
          context = {
            items: [{
              type: 'Contact',
              title: name,
              email: email
            }]
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
        if (name && email) {
          context = {
            items: [{
              type: 'Contact',
              title: name,
              email: email
            }]
          };

          return false;
        }
      }
    });

    return context;
  }
}

export class SlackInspector extends Inspector {

  // FIXME: Now it's the channel ID e.g https://minderlabs.slack.com/messages/C4BPPS9RC/details/
  static PATH_RE = /https:\/\/([^\.]+)\.slack\.com\/messages\/([^\/]+)\//;

  isValid() {
    this._matches = document.location.href.match(SlackInspector.PATH_RE);
    return this._matches;
  }

  getInitialContext() {
    let context = [];
    if (this._matches && this._matches.length == 3) {
      context = [
        {
          key: 'slack_team',
          value: {
            string: this._matches[1]
          }
        },
        {
          key: 'slack_channel',
          value: {
            string: this._matches[2]
          }
        },
      ]
    }
    return context;
  }

  getRootNode() {
    // Hack -- we don't need a root node, just return true so this inspector gets run.
    // FIXME: don't need this now with getInitialContext.
    return true;
  }

  inspect(mutations) {
    let context = null;

    _.each(mutations, mutation => {

      // TODO(burdon): Get closest parent for thread ID.
//    let root = $(mutation.target).find('div[role="listitem"] h3 span');
      let root = $('div[role="main"] div[role="listitem"] h3 span');
      if (root[0]) {
        let name = root.text();
        let email = root.attr('email');
        if (name && email) {
          context = {
            items: [{
              type: 'Contact',
              title: name,
              email: email
            }]
          };

          return false;
        }
      }
    });

    return context;
  }
}
