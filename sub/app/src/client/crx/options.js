//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { ChromeMessageChannel, ChromeMessageChannelRouter } from 'minder-core';

import { BackgroundCommand } from './common';
import { Settings } from './util/settings';

import { DefaultSettings, Defs } from './common';

import './options.less';

/**
 * Options handler.
 */
class Options extends React.Component {

  state = {
    settings: {}
  };

  constructor() {
    super(...arguments);

    this._settings = new Settings(DefaultSettings);
    this._settings.onChange.addListener(settings => {
      this.setState({
        settings
      });
    });

    // Do initial load then fire update.
    this._settings.load(true);

    // Message channel to background page.
    this._systemChannel = new ChromeMessageChannel(BackgroundCommand.CHANNEL, new ChromeMessageChannelRouter());

    // TODO(burdon): Subscribe to changes from BG page (config and client state).
    chrome.extension.getBackgroundPage().app.onChange.addListener(() => {
      console.log('App updated.');
    });
  }

  onReset() {
    this._settings.reset();
  }

  onReconnect() {
    return this._systemChannel.postMessage({
      command: BackgroundCommand.RECONNECT
    });
  }

  onAuthenticate() {
    return this._systemChannel.postMessage({
      command: BackgroundCommand.SIGNOUT
    });
  }

  onChangeValue(property, event) {
    let { target } = event;

    let value;
    switch (target.type) {
      case 'checkbox': {
        value = target.checked;
        break;
      }

      default: {
        value = target.value;
      }
    }

    this._settings.set(property, value);
  }

  render() {
    let { settings } = this.state;

    // TODO(burdon): Auto-open.
    // TODO(burdon): Debug/logging option.

    return (
      <div>
        <div className="crx-panel crx-form">
          <div className="crx-section">
            <label>
              <input type="checkbox"
                     value={ settings.notifications }
                     onChange={ this.onChangeValue.bind(this, 'notifications') }/> Notifications
            </label>
          </div>

          <br/>
          <div className="crx-section">
            <h2>Debugging</h2>
            <label htmlFor="settings_server">Server</label>
            <select name="settings_server"
                    value={ settings.server }
                    onChange={ this.onChangeValue.bind(this, 'server') }>
              { _.map(Defs.SERVER, (option, type) =>
              <option key={ option.value } value={ option.value }>{ option.title }</option>)
              }
            </select>
          </div>

          <div className="crx-section">
            <button onClick={ this.onReset.bind(this) }>Reset Options</button>
            <button onClick={ this.onReconnect.bind(this) }>Reconnect</button>
            <button onClick={ this.onAuthenticate.bind(this) }>Authenticate</button>
          </div>

          <div className="crx-section">
            <pre>
              { JSON.stringify(settings, null, 2) }
            </pre>
            <pre>
              { JSON.stringify(chrome.extension.getBackgroundPage().app.config, null, 2) }
            </pre>
          </div>
        </div>

      </div>
    );
  }
}

ReactDOM.render(
  <Options/>, document.getElementById('app-root')
);
