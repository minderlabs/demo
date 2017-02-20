//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { ChromeMessageChannel, ChromeMessageChannelRouter } from 'minder-core';

import { BackgroundCommand } from './common';
import { Settings } from './util/settings';

import './options.less';

import { DefaultSettings } from './common';

/**
 * Options handler.
 */
class Options extends React.Component {

  // TODO(burdon): Constants.
  static options = {
    server: [
      { value: 'http://localhost:3000',             title: 'localhost' },
      { value: 'https://demo-dev.minderlabs.com',   title: 'https://demo-dev.minderlabs.com' }
    ]
  };

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
    this._settings.set(property, event.target.value);
  }

  render() {
    let { settings } = this.state;

    // TODO(burdon): Auto-open.
    // TODO(burdon): Debug/logging option.

    return (
      <div>
        <div className="crx-panel crx-form">
          <div className="crx-section">
            <label><input type="checkbox"/> Notifications</label>
          </div>

          <br/>
          <div className="crx-section">
            <h2>Debugging</h2>
            <label htmlFor="settings_server">Server</label>
            <select name="settings_server"
                    onChange={ this.onChangeValue.bind(this, 'server') }
                    value={ settings.server }>
              { _.map(Options.options['server'], option =>
                <option key={ option.value } value={ option.value }>{ option.title }</option>) }
            </select>
          </div>

          <div className="crx-section">
            <button onClick={ this.onReset.bind(this) }>Reset Options</button>
            <button onClick={ this.onReconnect.bind(this) }>Reconnect</button>
            <button onClick={ this.onAuthenticate.bind(this) }>Authenticate</button>
          </div>

          <div className="crx-section">
            <pre>
              { JSON.stringify(chrome.extension.getBackgroundPage().app.config, 0, 1) }
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
