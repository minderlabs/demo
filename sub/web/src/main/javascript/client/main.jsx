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
 * Main App.
 */
class App extends React.Component {

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

  handleUpdate() {
    this.props.model.update();
  }

  render() {
    let items = this.state.items.map((item) => {
      return (
        <div key={ item.id }>{ item.title }</div>
      );
    });

    return (
      <div>
        <h1>React Demo</h1>
        <button onClick={ this.handleUpdate.bind(this) }>Update</button>
        <div className="app-list">
          { items }
        </div>
      </div>
    );
  }
}

render(<App model={ new Model('/data/test.json') }/>, document.getElementById('app-container'));
