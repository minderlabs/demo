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

  onConnect() {
    return this._systemChannel.postMessage({
      command: SystemChannel.CONNECT
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

    console.log('...');
    this._settings.set(property, value).then(values => {
      console.log('>>>>', values);
      this.forceUpdate();
    });
  }

  onRefresh() {
    this.forceUpdate();
  }

  render() {
    let settings = this._settings.values;

    return (
      <div>
        <div className="crx-panel crx-form">

          <div className="crx-section">
            <label>
              <input type="checkbox"
                     checked={ _.get(settings, 'crx.notifications') }
                     onChange={ this.onChangeValue.bind(this, 'crx.notifications') }/> Desktop notifications.
            </label>
            <label>
              <input type="checkbox"
                     checked={ _.get(settings, 'crx.autoOpen') }
                     onChange={ this.onChangeValue.bind(this, 'crx.autoOpen') }/> Auto-open on update.
            </label>
            <label>
              <input type="checkbox"
                     checked={ _.get(settings, 'crx.openTab') }
                     onChange={ this.onChangeValue.bind(this, 'crx.openTab') }/> Open links in new tab.
            </label>
          </div>

          <div className="crx-section crx-debug-section">
            <h3>Debugging</h3>
            <div>
              <select name="settings_server"
                      value={ settings.server }
                      onChange={ this.onChangeValue.bind(this, 'server') }>
                { _.map(Defs.SERVER, (option, type) =>
                <option key={ option.value } value={ option.value }>{ option.title }</option>)
                }
              </select>
            </div>
          </div>

          <div className="crx-section crx-debug-section crx-expand">
            <h3>Config</h3>
            <pre>
              { JSON.stringify(chrome.extension.getBackgroundPage().app.config, null, 2) }
            </pre>
          </div>

          <div className="crx-section crx-debug-section">
            <div className="crx-buttons">
              <div>
                <button onClick={ this.onReset.bind(this) }>Reset Settings</button>
                <button onClick={ this.onAuthenticate.bind(this) }>Authenticate</button>
                <button onClick={ this.onConnect.bind(this) }>Connect</button>
              </div>
              <div>
                <button onClick={ this.onRefresh.bind(this) }>Refresh</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <Options/>, document.getElementById('app-root')
);
