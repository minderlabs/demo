//
// Copyright 2017 Minder Labs.
//

import { Logger } from 'minder-core';

const logger = Logger.get('inspector');

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
        if (inspector.shouldObservePage()) {
          logger.log('Inspector: ' + inspector.constructor.name);
          let { context, rootNode } = inspector.getPageState();
          if (context) {
            // TODO(madadam): This happens too early, before the sidebar is loaded. Need to keep it cached
            // and supply it when the sidebar is done loading.
            callback(context);
          }
          if (rootNode) {
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
      logger.log('Context: ' + JSON.stringify(context));
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
   * @return {boolean} Returns true if this inspector should start observers for the current page.
   *
   * Note that this is only called once, but in dynamic web apps, window.location.href can change
   * without reloading the page. Observers are responsible for handling that.
   */
  shouldObservePage() {
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

  shouldObservePage() {
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

  shouldObservePage() {
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

  shouldObservePage() {
    return document.location.href.startsWith(GoogleInboxInspector.PATH);
  }

  getRootNode() {
    // TODO(burdon): Document where this is and how stable it is.
    return $('.yDSKFc')[0];
  }

  /*
   * <div role="list" data-item-id="#gmail:thread-f:1557184509751026059">
   *   <div role="listitem" data-msg-id="#msg-f:1557184509751026059">
   *     ...
   *     <div>
   *       ...
   *       <div>
   *         <img email="__EMAIL__" src="__THUMBNAILURL__">  [40x40]
   *
   *       <div role="heading">
   *         ...
   *           <div email="__EMAIL__">__NAME__</div>
   */
  inspect(mutations) {
    let context = null;

    _.each(mutations, mutation => {
      let listItems = $(mutation.target).find('div[role=list] div[role=listitem][data-msg-id]');
      if (listItems.length) {
        let emails = new Set();
        context = {
          items: _.compact(_.map(listItems, listItem => {
            let header = $(listItem).find('div[role=heading] div[email]:first');
            let email = header.attr('email');

            if (!emails.has(email)) {
              emails.add(email);

              let title = header.text();

              // TODO(burdon): First time opening a thread, the img.src is invalid.
              let img = $(listItem).find('img[email]:first');
              let thumbnailUrl = $(img).attr('src');
              if (thumbnailUrl && thumbnailUrl.startsWith('//')) {
                thumbnailUrl = 'https:' + thumbnailUrl;
              }

              return {
                type: 'Contact',
                title,
                email,
                thumbnailUrl
              }
            }
          }))
        };

        return false;
      }
    });

    return context;
  }
}

/**
 * Slack Inspector
 */
export class SlackInspector extends Inspector {

  static PATH_RE = /https:\/\/([^\.]+)\.slack\.com\/messages\/([^\/]+)\//;

  shouldObservePage() {
    this._matches = document.location.href.match(SlackInspector.PATH_RE);
    return this._matches;
  }

  getContextFromDocumentLocation() {
    let context = [];
    this._matches = document.location.href.match(SlackInspector.PATH_RE);
    if (this._matches && this._matches.length === 3) {
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
        }
      ]
    }
    // TODO(madadam): Unify other uses (email) and return context (array of KeyValues) not dict { context: [..] }.
    return {
      context
    };
  }

  getInitialContext() {
    return this.getContextFromDocumentLocation();
  }

  getRootNode() {
    return $('#client_header')[0];
  }

  inspect(mutations) {
    return this.getContextFromDocumentLocation();
  }
}
