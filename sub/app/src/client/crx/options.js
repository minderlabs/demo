//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { Settings } from './util/settings';

import './options.less';

import { DefaultSettings } from './common';

/**
 * Options handler.
 */
class Options extends React.Component {

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
    this._settings.onChange(settings => {
      this.setState({
        settings
      });
    });

    this._settings.load().then(settings => this._settings.fireUpdate());
  }

  onReset() {
    this._settings.reset();
  }

  onChange(property, event) {
    this._settings.set(property, event.target.value);
  }

  render() {
    let { settings } = this.state;

    // TODO(burdon): Auto-open.
    // TODO(burdon): Debug options.

    return (
      <div>

        <div className="crx-panel crx-form">
          <h2>Debugging</h2>
          <div className="crx-section">
            <label htmlFor="settings_server">Server</label>
            <select name="settings_server" onChange={ this.onChange.bind(this, 'server') } value={ settings.server }>
              { _.map(Options.options['server'], option =>
                <option key={ option.value } value={ option.value }>{ option.title }</option>) }
            </select>
          </div>

          <div className="crx-section">
            <button onClick={ this.onReset.bind(this) }>Reset</button>
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
