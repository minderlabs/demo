//
// Copyright 2017 Minder Labs.
//

import { KeyListener } from 'minder-core';

import { InspectorRegistry, InboxInspector } from './util/inspector';

import './content_script.less';

// Unique ID for this content script.
const scriptId = new Date().getTime();

/**
 * Content Script is loaaded on all pages declared in the manifest.
 *
 * NOTE: All CRX is self-container (does not reference minder-ux, etc.)
 */
class ContentScript {

  static SIDEBAR_FRAME_SRC = chrome.extension.getURL('page/sidebar.html?frame=sidebar&script=' + scriptId);

  manifest = chrome.runtime.getManifest();

  constructor() {
    console.log(`${this.manifest.name} ${this.manifest.version}`);

    // Root element.
    let container = $('<div>').addClass('crx-content-script').appendTo(document.body);

    // Frame elements.
    this._frames = {
      sidebar: new Frame(ContentScript.SIDEBAR_FRAME_SRC,
        $('<div>').addClass('crx-sidebar').appendTo(container))
    };

    // Hidden button to grab focus (after sidebar closes).
    let button = $('<button>').appendTo(container).click(() => {
      this._frames.sidebar.toggle();
    });

    // TODO(burdon): Browser action to toggle window.
    // TODO(burdon): Show logo/chip bottom right to represent CS has loaded.

    let inspectors = new InspectorRegistry()
      .add(new InboxInspector())
      .init(events => {
        console.log('###', JSON.stringify(events));

        // TODO(burdon): Wait for window to open and send ready (OPEN) message..
        let frameWindow = this._frames.sidebar.open();
        frameWindow.postMessage({
          events
        }, '*');
      });

    // TODO(burdon): Factor out.
    // TODO(burdon): Proxy via background page.
    // https://developer.chrome.com/extensions/messaging#external-webpage
    // http://stackoverflow.com/questions/11325415/access-iframe-content-from-a-chromes-extension-content-script
    // Listen to frames.
    window.addEventListener('message', event => {
      if (event.origin == 'chrome-extension://' + chrome.runtime.id) {
        console.assert(event.data.script == scriptId);
        console.log('Received: ' + JSON.stringify(event.data));
        let message = event.data.message;
        switch (message.command) {
          case 'OPEN': {
            _.get(this._frames, event.data.frame).open();
            break;
          }

          case 'CLOSE': {
            _.get(this._frames, event.data.frame).close();
            button.focus();
            break;
          }
        }
      }
    });

    // Keyboard shortcuts.
    let keys = new KeyListener()
      .listen({
        keyCode: 8,   // DELETE
        metaKey: true
      }, () => this._frames.sidebar.toggle());
  }
}

/**
 * Pop-up frame.
 */
class Frame {

  constructor(src, root) {
    console.assert(src && root);

    this._src = src;
    this._root = root;
    this._frame = null;
  }

  toggle() {
    this._root.hasClass('crx-open') ? this.close() : this.open();
  }

  open() {
    if (!this._frame) {
      // Creating the frame loads the content.
      // TODO(burdon): Get open trigger from the sidebar.
      this._frame = $('<iframe>')
        .attr('src', this._src)
        .attr('width', '100%')
        .attr('height', '100%')
        .appendTo(this._root);
    } else {
      this._root.addClass('crx-open');
    }

    return this._frame[0].contentWindow;
  }

  close() {
    this._root.removeClass('crx-open');
  }
}

const app = new ContentScript();
