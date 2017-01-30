//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import './browser_action.less';

/**
 * Browser Action.
 */
class BrowserAction extends React.Component {

  // TODO(burdon): Access BG page directly.
  // chrome.extension.getBackgroundPage().app.config;

  state = {
    url: ''
  };

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

  render() {
    let { url } = this.state;

    // TODO(burdon): Page dependent (e.g., on Gmail clip contact).

    return (
      <div className="crx-browser-action">
        <div className="crx-column">
          <h1>Minder</h1>
          <button onClick={ this.handleClip.bind(this) }>Bookmark Page</button>
          <div>{ url }</div>
        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <BrowserAction/>, document.getElementById('app-root')
);
