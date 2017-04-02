//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import './debug.less';

/**
 * Debug panel.
 */
export class DebugPanel extends React.Component {

  render() {
    return (
      <div className="app-debug-panel">
        <h3>Debug Settings</h3>
        <div>
          <label><input type="checkbox"/> Reducer</label>
          <label><input type="checkbox"/> Invalidations</label>
          <label><input type="checkbox"/> Optimistic Responses</label>
          <label><input type="checkbox"/> Network Delay</label>
        </div>
      </div>
    );
  }
}
