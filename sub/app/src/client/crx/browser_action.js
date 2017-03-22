//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { ChromeMessageChannel, ChromeMessageChannelRouter } from 'minder-core';

import { SystemChannel, SidebarCommand } from './common';

import './browser_action.less';

/**
 * Browser Action.
 */
class BrowserAction extends React.Component {

  constructor() {
    super(...arguments);

    // Message channel to background page.
    this._systemChannel = new ChromeMessageChannel(SystemChannel.CHANNEL, new ChromeMessageChannelRouter().connect());

    this.state = {
      url: ''
    };
  }

  handleClip() {
    // https://developer.chrome.com/extensions/tabs#method-query
    chrome.tabs.query({
      active: true,
      windowId: chrome.windows.WINDOW_ID_CURRENT
    }, tabs => {
      let tab = tabs[0];
      console.assert(tab);
      this.setState({
        url: tab.url
      });
    });
  }

  handleAuthenticate() {
    // TODO(burdon): Access BG page directly?
    // chrome.extension.getBackgroundPage().app.config;

    return this._systemChannel.postMessage({
      command: SystemChannel.AUTHENTICATE
    }, true).then(response => {
      window.close();
    });
  }

  openSidebar() {
    chrome.tabs.query({
      active: true,
      windowId: chrome.windows.WINDOW_ID_CURRENT
    }, tabs => {
      let tab = tabs[0];
      console.assert(tab);
      chrome.tabs.executeScript(tab.id, {
        code: 'window.postMessage({command: "' + SidebarCommand.SET_VISIBILITY + '" }, "*");'
      }, results => {
        window.close();
      });
    });
  }

  render() {
    let { url } = this.state;

    // TODO(burdon): Page dependent (e.g., on Gmail clip contact).

    return (
      <div className="crx-browser-action">
        <div className="crx-column">
          <button onClick={ this.handleAuthenticate.bind(this) }>Authenticate</button>
          <button onClick={ this.openSidebar.bind(this) }>Open</button>
        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <BrowserAction/>, document.getElementById('app-root')
);
