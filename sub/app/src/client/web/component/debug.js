//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import './debug.less';

/**
 * Debug panel.
 */
export class DebugPanel extends React.Component {

  // TODO(burdon): Show/hide based on Redux state.

  static contextTypes = {
    config: React.PropTypes.object.isRequired
  };

  handleOptionChanged(name, event) {
    let { config } = this.context;
    let value = event.target.checked;

    // TODO(burdon): Redux action to recreate network interface.
    if (name === 'networkDelay') {
      value = value ? 2000 : 0;
    }

    _.set(config.options, name, value);
    this.forceUpdate();
  }

  render() {
    let { config } = this.context;
    let { reducer, optimistic, invalidation, networkDelay } = config.options;

    return (
      <div className="app-debug-panel">
        <h3>Debug Settings</h3>
        <div>
          <div>
            <label className="ux-text-noselect">
              <input type="checkbox"
                     onChange={ this.handleOptionChanged.bind(this, 'reducer') }
                     checked={ reducer }/> Reducer</label>
          </div>
          <div>
            <label className="ux-text-noselect">
              <input type="checkbox"
                     onChange={ this.handleOptionChanged.bind(this, 'optimistic') }
                     checked={ optimistic }/> Optimistic Responses</label>
          </div>
          <div>
            <label className="ux-text-noselect">
              <input type="checkbox"
                     onChange={ this.handleOptionChanged.bind(this, 'invalidation') }
                     checked={ invalidation }/> Invalidations</label>
          </div>
          <div>
            <label className="ux-text-noselect">
              <input type="checkbox"
                     onChange={ this.handleOptionChanged.bind(this, 'networkDelay') }
                     checked={ !!networkDelay }/> Network Delay</label>
          </div>
        </div>
      </div>
    );
  }
}
