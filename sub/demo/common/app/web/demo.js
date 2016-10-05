//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import { ListModel } from '../../data/model';
import { ListView } from '../../components/web/list';

import './demo.less';

/**
 * Main App.
 */
export class App extends React.Component {

  constructor(props, context) {
    super(props, context);

    this._model = new ListModel('data/test.json');
  }

  handleRefresh() {
    this._model.update();
  }

  // TODO(burdon): Factor out input bar.

  handleKeyUp(event) {
    switch (event.keyCode) {
      case 13: {
        this.handleCreate(event);
        break;
      }
    }
  }

  handleCreate(event) {
    let title = this.refs.input.value;
    if (title) {
      this._model.insert(title);
    }
    this.refs.input.focus();
  }

  render() {
    return (
      <div className="app-panel app-panel-column">
        <h1>{ this.props.title }</h1>

        <div className="app-section app-toolabar">
          <button onClick={ this.handleRefresh.bind(this) }>Refresh</button>
        </div>

        <div className="app-section app-expand">
          <ListView model={ this._model }/>
        </div>

        <div className="app-section app-toolbar">
          <input ref="input" type="text" autoFocus="autoFocus" className="app-expand"
                 onKeyUp={ this.handleKeyUp.bind(this) }/>
          <button onClick={ this.handleCreate.bind(this) }>Create</button>
        </div>
      </div>
    );
  }
}
