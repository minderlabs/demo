//
// Copyright 2017 Minder Labs.
//

import { WindowMessenger, HttpUtil, KeyListener } from 'minder-core';

import { SidebarCommand, KeyToggleSidebar } from './common';
import { InspectorRegistry, TestInspector, GoogleInboxInspector } from './util/inspector';

import './content_script.less';

// Unique ID for this content script.
const scriptId = new Date().getTime();

/**
 * Content Script is loaaded on all pages declared in the manifest.
 *
 * NOTE: All CRX is self-container (does not reference minder-ux, etc.)
 */
class ContentScript {

  static manifest = chrome.runtime.getManifest();

  constructor() {
    console.log(`${ContentScript.manifest.name} ${ContentScript.manifest.version}`);

    // Root element.
    let container = $('<div>')
      .addClass('crx-content-script')
      .appendTo(document.body);

    // Button to grab focus (after sidebar closes).
    let button = $('<button>')
      .append($('<img>')
        .attr('title', '⌘-DEL')
        .attr('src', chrome.extension.getURL('img/icon_128.png')))
      .click(() => { this.sidebar.toggle() })
      .appendTo(container);

    // Frame elements.
    this.sidebar = new Frame('page/sidebar.html', 'sidebar/' + scriptId,
      $('<div>').addClass('crx-sidebar').appendTo(container), () => {
        console.log('Opening...');
        button.addClass('crx-bounce');
      });

    // Notify sidebar of visibility.
    const updateVisibility = (visible) => {
      this.sidebar.messenger.sendMessage({
        command: SidebarCommand.UPDATE_VISIBILITY,
        visible
      })
    };

    //
    // Listen for messages from the SidebarApp (frame).
    //
    this.sidebar.messenger.listen(message => {
      switch (message.command) {

        //
        // Sidebar loaded and is ready.
        //
        case SidebarCommand.INITIALIZED: {
          this.sidebar.initialized().open().then(visible => updateVisibility(visible));
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
          break;
        }
      }
    });

    //
    // Listen for context updates from the Inspectors.
    //
    let inspectors = new InspectorRegistry()
      .add(new TestInspector())
      .add(new GoogleInboxInspector())
      .init(context => {

        // Send update to SidebarApp.
        const send = () => {
          this.sidebar.messenger.sendMessage({
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
      .listen(KeyToggleSidebar, () => this.sidebar.toggle().then(visible => updateVisibility(visible)));
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
    this._serverProvider = root;

    // Lazily instantiated frame (loads content when created).
    this._frame = null;

    // Blocking promise (for initial message).
    this._blocking = null;
    this._onLoading = onLoading;

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
    this._blocking && this._blocking(true);

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
        .appendTo(this._serverProvider);

      // Resolve when sidebar has loaded (and the INITIALIZED message is received).
      return new Promise((resolve, reject) => {
        this._blocking = resolve;
        this._onLoading && this._onLoading();
      });
    } else {
      this._serverProvider.addClass('crx-open');
      return Promise.resolve(true);
    }
  }

  /**
   * Closes the sidebar.
   * @return {Promise}
   */
  close(unload=false) {
    this._serverProvider.removeClass('crx-open');
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
    if (this._serverProvider.hasClass('crx-open')) {
      return this.close();
    } else {
      return this.open();
    }
  }
}

// Create the app.
// TODO(burdon): Use Redux?
const app = new ContentScript();

// Auto-open if testing.
if ($('#crx-testing')[0]) {
  app.sidebar.open();
}
