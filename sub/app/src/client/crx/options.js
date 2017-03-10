//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { ChromeMessageChannel, ChromeMessageChannelRouter } from 'minder-core';

import { SystemChannel } from './common';
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
    this._systemChannel = new ChromeMessageChannel(SystemChannel.CHANNEL, new ChromeMessageChannelRouter());

    // TODO(burdon): Subscribe to changes from BG page (config and client state).
    chrome.extension.getBackgroundPage().app.onChange.addListener(() => {
      console.log('App updated.');
    });
  }

  onReset() {
    this._settings.reset();
  }

  onRegister() {
    return this._systemChannel.postMessage({
      command: SystemChannel.REGISTER_CLIENT
    }, true).then(response => {
      this.onRefresh();
    });
  }

  onAuthenticate() {
    return this._systemChannel.postMessage({
      command: SystemChannel.AUTHENTICATE
    }, true).then(response => {
      this.onRefresh();
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

  onRefresh() {
    this.forceUpdate();
  }

  render() {
    let { settings } = this.state;

    return (
      <div>
        <div className="crx-panel crx-form">
          <div className="crx-section">
            <label>
              <input type="checkbox"
                     value={ settings.notifications }
                     onChange={ this.onChangeValue.bind(this, 'notifications') }/> Desktop Notifications
            </label>
            <label>
              <input type="checkbox"
                     value={ settings.autoopen }
                     onChange={ this.onChangeValue.bind(this, 'autoopen') }/> Auto-open Sidebar
            </label>
            <label>
              <input type="checkbox"
                     value={ settings.webapp }
                     onChange={ this.onChangeValue.bind(this, 'webapp') }/> Navigate to Web App
            </label>
          </div>

          <div className="crx-section">
            <h2>Debugging</h2>
            <select name="settings_server"
                    value={ settings.server }
                    onChange={ this.onChangeValue.bind(this, 'server') }>
              { _.map(Defs.SERVER, (option, type) =>
              <option key={ option.value } value={ option.value }>{ option.title }</option>)
              }
            </select>
          </div>

          <div className="crx-section">
            <button onClick={ this.onReset.bind(this) }>Reset Settings</button>
            <button onClick={ this.onAuthenticate.bind(this) }>Re-authenticate</button>
            <button onClick={ this.onRegister.bind(this) }>Re-register</button>
          </div>

          <div>
            <pre>
              { JSON.stringify(chrome.extension.getBackgroundPage().app.config, null, 2) }
            </pre>

            <button onClick={ this.onRefresh.bind(this) }>Refresh</button>
          </div>
        </div>

      </div>
    );
  }
}

ReactDOM.render(
  <Options/>, document.getElementById('app-root')
);
