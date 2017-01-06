//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { List, TextBox } from '../../index';

/**
 * Test view.
 */
export class TestView extends React.Component {

  // TODO(burdon): ux-core matcher with test store.

  static Items = [];

  constructor() {
    super(...arguments);

    // NOTE: The textbox state should be maintained in the parent container.
    this.state = {
      value: 'test',
      item: null
    };

    for (let i = 0; i < 50; i++) {
      TestView.Items.push({
        id: 'I-' + i,
        title: 'Item ' + i
      });
    }
  }

  handleChange(value) {
    this.setState({
      value: value
    });
  }

  handleSelect(item) {
    this.setState({
      item: item
    })
  }

  // TODO(burdon): Textbox bug due to Redux?

  render() {
    return (
      <div className="test-view">
        <h1>Test View</h1>

        <TextBox value={ this.state.value }
                 autoFocus={ true }
                 onChange={ this.handleChange.bind(this) }/>

        <div className="test-panel">{ this.state.value }</div>

        <div className="ux-scroll-container">
          <div className="ux-scroll-panel">
            <List items={ TestView.Items }
                onItemSelect={ this.handleSelect.bind(this) }/>
          </div>
        </div>

        <div className="test-panel">{ JSON.stringify(this.state.item) }</div>
      </div>
    );
  }
}
