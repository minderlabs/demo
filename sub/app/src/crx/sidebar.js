//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { HttpUtil } from 'minder-core';

import './sidebar.less';

// TODO(burdon): Figure out how to test this outside of CRX. No CRX deps.
// TODO(burdon): Common guts with App (just different layout and configuration).
// TODO(burdon): Test HTTP GET (Apollo, etc.)

const args = HttpUtil.parseUrl();

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

/**
 * CRX Sidebar App.
 */
class SidebarApp extends React.Component {

  handleClose() {
    this.props.messenger.sendMessage({ command: 'CLOSE' });
  }

  render() {
    return (
      <div className="crx-sidebar">
        <h1>Minder</h1>
        <div>
          <button onClick={ this.handleClose.bind(this) }>Close</button>
        </div>
      </div>
    );
  }
}

let messenger = new Messenger(args.script, args.frame)

let app = <SidebarApp messenger={ messenger }/>;

ReactDOM.render(app, document.getElementById('crx-root'));

messenger.sendMessage({ command: 'OPEN' });
