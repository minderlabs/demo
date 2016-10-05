//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import { render } from 'react-dom';

import './main.less';

/**
 * Data source.
 */
class Model {

  // TODO(burdon): Move to common code (shared with native).
  // TODO(burdon): Same abstraction used by Android (ListView.DataSource)?

  constructor(path) {
    this._path = path;
    this._listener = null;
  }

  // TODO(burdon): Is this the right pattern for React? (compare with native).
  setListener(listener) {
    this._listener = listener;
    return this;
  }

  update() {
    $.get(this._path, (result) => {
      this._listener(result);
    });

    return this;
  }
}

/**
 * List component.
 */
class List extends React.Component {

  // TODO(burdon): Move to common/ux (create web and native components in parallel).

  constructor(props, context) {
    super(props, context);

    this.state = {
      items: []
    };

    this.props.model.setListener((result) => {
      this.setState({
        items: result['items'] || []
      });
    });
  }

  render() {
    let rows = this.state.items.map((item) => {
      return (
        <tr key={ item.id }>
          <td>{ item.id }</td>
          <td>{ item.version }</td>
          <td>{ item.title }</td>
        </tr>
      );
    });

    return (
      <div className="app-list">
        <table>
          <tbody>
            { rows }
          </tbody>
        </table>
      </div>
    );
  }
}

/**
 * Main App.
 */
class App extends React.Component {

  handleUpdate() {
    this.props.model.update();
  }

  render() {
    return (
      <div>
        <h1>React Demo</h1>

        <div className="app-section app-toolabar">
          <button onClick={ this.handleUpdate.bind(this) }>Update</button>
        </div>

        <div className="app-section">
          <List model={ this.props.model }/>
        </div>
      </div>
    );
  }
}

render(<App model={ new Model('data/test.json') }/>, document.getElementById('app-container'));
