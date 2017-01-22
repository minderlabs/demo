//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { HttpUtil } from 'minder-core';

import './sidebar.less';

// TODO(burdon): Common guts with App (just different layout and configuration).
// TODO(burdon): Figure out how to test this outside of CRX. No CRX deps.
// TODO(burdon): Test React/Apollo.

// Config passed from content script container.
const config = HttpUtil.parseUrl();

// TODO(burdon): Factor out.
class Messenger {

  constructor(script, frame) {
    console.assert(script && frame);

    this._script = script;
    this._frame = frame;
  }

  sendMessage(message) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
    // TODO(burdon): '*' could be intercepted by anything else on the page.
    parent.postMessage({
      script: this._script,
      frame: this._frame,
      message
    }, '*');
  }
}

window.addEventListener('message', event => {
  console.log('!!!!!!!!!!!!!!!!!', event);
});

/**
 * CRX Sidebar App.
 */
class SidebarApp extends React.Component {

  handleClose() {
    this.props.messenger.sendMessage({ command: 'CLOSE' });
  }

  render() {
    return (
      <div className="crx-panel crx-sidebar crx-expand">
        <div className="crx-panel crx-header">
          <h1>Minder</h1>
        </div>

        <div className="crx-panel crx-expand">
        </div>

        <div className="crx-panel crx-footer">
          <button onClick={ this.handleClose.bind(this) }>Close</button>
        </div>
      </div>
    );
  }
}

let messenger = new Messenger(config.script, config.frame)

let app = <SidebarApp messenger={ messenger }/>;

ReactDOM.render(app, document.getElementById('crx-root'));

messenger.sendMessage({ command: 'OPEN' });
