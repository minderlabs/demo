//
// Copyright 2017 Minder Labs.
//

import { HttpUtil, KeyListener, Logger, WindowMessenger } from 'minder-core';

import { SidebarCommand, KeyCodes } from './common';
import { InspectorRegistry, GmailInspector, GoogleInboxInspector, SlackInspector, TestInspector } from './util/inspector';

import './content_script.less';

const logger = Logger.get('cs');

// Unique ID for this content script.
const scriptId = Date.now();

/**
 * Content Script is loaaded on all pages declared in the manifest.
 *
 * NOTE: The OAuth spec in the manifest must match the console credentials.
 * NOTE: The content script is self-contained (does not reference minder-ux, to keep small etc.)
 *
 * Lifecycle:
 * 0). On install, the background page attempts to authenticate and connect with the server,
 *     registering the CRX client.
 * 1). According to the manifest.yml content_scripts.matches, the content script injected on page load.
 * 2). The content script creates a frame but does not load the sidebar until requested.
 * 3). An icon is visible (bottom right) once the content script is loaded.
 * 4). Pressing the icon, or keying the toggle key loads the sidebar content for the first time.
 * 5). The sidebar loading and initialization isn't instantaneous, so the icon is bounced to let the user
 *     know that something is happening.
 * 6). The sidebar app then sends a request to the background page to get the client registration info
 *     (userId, clientId, etc.) NOTE: This may retry if the background page isn't currently registered.
 * 7). Once the registration is received, the sidebar app completes its initialization, renders the app, and
 *     then sends a ready message to the content script.
 *     NOTE: The sidebar configues its Apollo client network interface to proxy GraphQL requests via a
 *     chrome message channel to the background page.
 * 8). The content script then adds a CSS class to the frame container to make it visible.
 * 9). Subsequent toggles just show/hide the frame container. However, the content script sends open/close
 *     notifications to the sidebar (since otherwise it would not know its visibility state).
 */
class ContentScript {

  // TODO(burdon): Remove jquery (smaller footprint).

  static manifest = chrome.runtime.getManifest();

  constructor() {
    logger.log(`${ContentScript.manifest.name} ${ContentScript.manifest.version}`);

    // Root element.
    let container = $('<div>').appendTo(document.body)
      .addClass('crx-content-script');

    // Keyboard hint.
    this.hint = $('<div>').appendTo(container)
      .addClass('crx-hint')
      .css('display', 'none');
    let idx = 0;
    _.each(KeyCodes.TOGGLE._KEYS_, key => {
      if (idx++ > 0) {
        $('<span>').text('+').appendTo(this.hint);
      }
      $('<span>').addClass('crx-key').text(key).appendTo(this.hint);
    });

    // Button to toggle sidebar.
    // Grabs focus so that pressing enter causes toggle.
    this.button = $('<button>').appendTo(container)
      .append($('<img>')
        .attr('src', chrome.extension.getURL('img/icon_128.png')))
        .css('cursor', 'pointer')
      .click(() => {
        this.hint.css('display', 'none');
        this.sidebar.toggle();
        this.button.focus();
      })
      .mouseover(() => {
        this.hint.css('display', 'block');
      })
      .mouseout(() => {
        this.hint.css('display', 'none');
      });

    // Frame elements.
    this.sidebar = new Frame(
      'page/sidebar.html',
      'sidebar/' + scriptId,
      $('<div>').addClass('crx-sidebar').appendTo(container),
      () => { this.button.addClass('crx-bounce') });

    //
    // Notify sidebar of visibility.
    // The content script controls opening and closing the frame, but the sidebar doesn't know this state
    // unless we tell it.
    // TODO(burdon): Use Redux actions to manage content script state.
    //
    const updateVisibility = (visible) => {
      this.sidebar.messenger.postMessage({
        command: SidebarCommand.UPDATE_VISIBILITY,
        visible
      })
    };

    //
    // Listen for messages from the SidebarApp (frame).
    //
    this.sidebar.messenger.listen(message => {
      logger.log('Message: ' + message.command);

      switch (message.command) {

        //
        // Errors.
        //
        case SidebarCommand.ERROR: {
          logger.error('Sidebar Error: ' + message.message);
          break;
        }

        //
        // Sidebar loaded and is ready.
        //
        case SidebarCommand.INITIALIZED: {
          // Hack to give sidebar time to complete initial render.
          setTimeout(() => {
            this.sidebar.initialized().open().then(visible => updateVisibility(visible));
          }, 500);

          break;
        }

        //
        // Sidebar wants to change visibility.
        //
        case SidebarCommand.SET_VISIBILITY: {
          let promise;
          if (message.open === true) {
            promise = this.sidebar.open();
          } else if (message.open === false) {
            promise = this.sidebar.close();
          } else {
            promise = this.sidebar.toggle();
          }

          promise.then(visible => updateVisibility(visible));
          this.button.focus();
          break;
        }

        default: {
          logger.error('Unknown command: ' + message.command);
        }
      }
    });

    // Listen for window events injected into this page (e.g. from the browser action bar).
    window.addEventListener('message', event => {

      let origin = event.origin || event.originalEvent.origin;
      // TODO(madadam): Should we also check origin for security? But the origin can be any page where the content
      // script runs, so it's not useful for filtering.

      // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#The_dispatched_event
      if (!event.isTrusted) {
        return;
      }

      // TODO(madadam): Support all SidebarCommands?
      let { data } = event;
      if (data.command === SidebarCommand.SET_VISIBILITY ) {
        let promise;
        if (data.open === true) {
          promise = this.sidebar.open();
        } else if (data.open === false) {
          promise = this.sidebar.close();
        } else {
          promise = this.sidebar.toggle();
        }

        promise.then(visible => updateVisibility(visible));
      }
    });

    //
    // Listen for context updates from the Inspectors.
    //
    let inspectors = new InspectorRegistry()
      .add(new TestInspector())
      .add(new GmailInspector())
      .add(new GoogleInboxInspector())
      .add(new SlackInspector())
      .init(context => {

        // Send update to SidebarApp.
        const send = () => {
          this.sidebar.messenger.postMessage({
            command: SidebarCommand.UPDATE_CONTEXT,
            context
          });
        };

        // TODO(burdon): Option to auto-open.
        const openOnEvent = false;
        if (openOnEvent) {
          // Maybe wait for sidebar to open.
          this.sidebar.open().then(() => send);
        } else {
          if (this.sidebar.loaded) {
            send();
          }
        }
      });

    // Shortcuts.
    const keyBindings = new KeyListener()
      .listen(KeyCodes.TOGGLE, () => {
        this.sidebar.toggle().then(visible => updateVisibility(visible));
        this.button.focus();
      });
  }
}

/**
 * IFrame that contains the lazily loaded components.
 */
class Frame {

  /**
   * Frame element to contain pop-up components.
   * @param {string} page Frame source.
   * @param {string} channel Routing identifier.
   * @param {Node} root Root node for iframe channel.
   * @param {Function} onLoading Loading Callback.
   */
  constructor(page, channel, root, onLoading) {
    console.assert(page && channel && root);

    // Frame source
    this._src = chrome.extension.getURL(page + '?' + HttpUtil.toUrlArgs({ channel }));

    // Root node.
    this._root = root;

    // Loading notifier.
    this._onLoading = onLoading;

    // Lazily instantiated frame (loads content when created).
    this._frame = null;

    // Blocking promise (for initial message).
    this._blocking = null;

    // iFrame messenger (valid after loaded).
    this._messenger = new WindowMessenger(channel, 'chrome-extension://' + chrome.runtime.id);
  }

  get messenger() {
    return this._messenger;
  }

  get loaded() {
    return !!this._frame;
  }

  initialized() {
    this._messenger.attach(this._frame[0].contentWindow);

    // Resolve blocking promise.
    if (this._blocking) {
      this._blocking(true);
      this._blocking = null;
    }

    return this;
  }

  /**
   * Opens the sidebar. Returns a promise that resolves when the sidebar is open.
   * @return {Promise}
   */
  open() {
    if (!this._frame) {
      // Creating the frame loads the content.
      // Sidebar sends OPEN event when loaded.
      this._frame = $('<iframe>')
        .attr('src', this._src)
        .attr('width', '100%')
        .attr('height', '100%')
        .appendTo(this._root);

      // Resolve when sidebar has loaded (and the INITIALIZED message is received).
      return new Promise((resolve, reject) => {
        logger.log('Loading sidebar...');
        this._blocking = resolve;
        this._onLoading && this._onLoading();
      });
    } else {
      if (this._blocking) {
        return Promise.reject('Not initialized.');
      }

      this._root.addClass('crx-open');
      return Promise.resolve(true);
    }
  }

  /**
   * Closes the sidebar.
   * @return {Promise}
   */
  close(unload=false) {
    this._root.removeClass('crx-open');
    if (unload) {
      this._frame.attr('src', 'about:blank');
    }

    return Promise.resolve(false);
  }

  /**
   * Toggle the sidebar state.
   * @return {Promise}
   */
  toggle() {
    if (this._root.hasClass('crx-open')) {
      return this.close();
    } else {
      return this.open();
    }
  }
}

// Create the app.
// TODO(burdon): Use Redux?
const app = new ContentScript();

// Auto-open if testing tag.
if ($('#crx-testing')[0]) {
  app.sidebar.open();
}
