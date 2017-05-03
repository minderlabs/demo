//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';

import './debug.less';

/**
 * Debug panel.
 */
export class DebugPanel extends React.Component {

  // TODO(burdon): Show/hide based on Redux state.

  static contextTypes = {
    config: PropTypes.object.isRequired
  };

  handleOptionChanged(name, event) {
    let { config } = this.context;
    let value = event.target.checked;

    // TODO(burdon): Redux action to recreate network interface.
    if (name === 'networkDelay') {
      value = value ? 200000 : 0;       // TODO(burdon): Const.
    }

    _.set(config.options, name, value);
    this.forceUpdate();
  }

  render() {
    let { config } = this.context;

    // TODO(burdon): Should be part of Redux state (to update listeners).
    let { reducer, optimistic, invalidation, networkDelay } = _.get(config, 'options', {});

    // console.warn('DEBUG\n' + JSON.stringify(config, null, 2));

    // TODO(burdon): D3 graph popup.
    // TODO(burdon): Move reconnect button here. Fire Redux action.
    // TODO(burdon): Batch Queries, Batch Mutations.

    return (
      <div className="app-debug-panel ux-text-noselect">
        <h3>Debug Settings</h3>
        <div>
          {/*
            <label>
              <input type="checkbox"
                     onChange={ this.handleOptionChanged.bind(this, 'debug.info') }
                     checked={ reducer }/> Debug Info</label>
          </div>
          */}
          <div>
            <label>
              <input type="checkbox"
                     onChange={ this.handleOptionChanged.bind(this, 'reducer') }
                     checked={ reducer }/> Reducer</label>
          </div>
          <div>
            <label>
              <input type="checkbox"
                     onChange={ this.handleOptionChanged.bind(this, 'optimistic') }
                     checked={ optimistic }/> Optimistic Responses</label>
          </div>
          <div>
            <label>
              <input type="checkbox"
                     onChange={ this.handleOptionChanged.bind(this, 'invalidation') }
                     checked={ invalidation }/> Invalidations</label>
          </div>
          <div>
            <label>
              <input type="checkbox"
                     onChange={ this.handleOptionChanged.bind(this, 'networkDelay') }
                     checked={ !!networkDelay }/> Network Delay</label>
          </div>
        </div>
      </div>
    );
  }
}
