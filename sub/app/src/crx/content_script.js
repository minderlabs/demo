//
// Copyright 2017 Minder Labs.
//

import { HttpUtil, KeyListener } from 'minder-core';

import { KeyToggleSidebar } from './common';
import { InspectorRegistry, InboxInspector } from './util/inspector';
import { Messenger } from './util/messenger';

import './content_script.less';

// Unique ID for this content script.
const scriptId = new Date().getTime();

/**
 * Content Script is loaaded on all pages declared in the manifest.
 *
 * NOTE: All CRX is self-container (does not reference minder-ux, etc.)
 */
class ContentScript {

  // TODO(burdon): Browser action to toggle window.
  // TODO(burdon): Show logo/chip bottom right to represent CS has loaded.

  static manifest = chrome.runtime.getManifest();

  constructor() {
    console.log(`${ContentScript.manifest.name} ${ContentScript.manifest.version}`);

    // Root element.
    let container = $('<div>').addClass('crx-content-script').appendTo(document.body);

    // Frame elements.
    let sidebar = new Frame('page/sidebar.html', 'sidebar/' + scriptId,
      $('<div>').addClass('crx-sidebar').appendTo(container));

    // Hidden button to grab focus (after sidebar closes).
    let button = $('<button>').appendTo(container).click(() => sidebar.toggle());

    // Listen for messages from the frame.
    sidebar.messenger.listen(message => {
      switch (message.command) {

        // TODO(burdon): Create Redux reducer (like sidebar).
        case 'INIT': {
          sidebar.initialized().open();
          break;
        }

        case 'OPEN': {
          sidebar.open();
          break;
        }

        case 'CLOSE': {
          sidebar.close();
          button.focus();
          break;
        }
      }
    });

    // Content inspector (listens for DOM changes).
    let inspectors = new InspectorRegistry()
      .add(new InboxInspector())
      .init(events => {
        // Wait for sidebar to load (if first time).
        sidebar.open().then(() => {
          sidebar.messenger.sendMessage({
            command: 'UPDATE',
            events
          }, '*');
        });
      });

    // Shortcuts.
    const keyBindings = new KeyListener()
      .listen(KeyToggleSidebar, () => sidebar.toggle());
  }
}

/**
 * IFrame contains the lazily loaded components.
 */
class Frame {

  /**
   * Frame element to contain pop-up components.
   * @param {string} page Frame source.
   * @param {string} channel Routing identifier.
   * @param {Node} root Root node for iframe channel.
   */
  constructor(page, channel, root) {
    console.assert(page && channel && root);

    // Frame source
    this._src = chrome.extension.getURL(page + '?' + HttpUtil.toUrlArgs({ channel }));

    // Root node.
    this._root = root;

    // Lazily instantiated frame (loads content when created).
    this._frame = null;

    // Blocking promise (for initial message).
    this._blocking = null;

    // iFrame messenger (valid after loaded).
    this._messenger = new Messenger(channel, 'chrome-extension://' + chrome.runtime.id);
  }

  get messenger() {
    return this._messenger;
  }

  toggle() {
    this._root.hasClass('crx-open') ? this.close() : this.open();
  }

  initialized() {
    this._messenger.attach(this._frame[0].contentWindow);
    this._blocking && this._blocking();

    return this;
  }

  open() {
    if (!this._frame) {
      // Creating the frame loads the content.
      // Sidebar sends OPEN event when loaded.
      this._frame = $('<iframe>')
        .attr('src', this._src)
        .attr('width', '100%')
        .attr('height', '100%')
        .appendTo(this._root);

      // Resolve when sidebar has loaded.
      return new Promise((resolve, reject) => {
        this._blocking = resolve;
      });
    } else {
      this._root.addClass('crx-open');

      // Resolve immediately.
      return new Promise((resolve, reject) => {
        resolve();
      });
    }
  }

  close() {
    this._root.removeClass('crx-open');
  }
}

// Create the app.
// TODO(burdon): Use Redux?
const app = new ContentScript();
