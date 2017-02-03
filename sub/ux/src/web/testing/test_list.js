//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { List, ListItem, TextBox } from '../../index';

/**
 * Test List.
 */
export default class TestList extends React.Component {

  // TODO(burdon): ux-core matcher with test store.

  constructor() {
    super(...arguments);

    // NOTE: The textbox state should be maintained in the parent container.
    this.state = {
      value: 'test',
      item: null
    };

    this.state = {
      items: [{
        id: 'I-0',
        title: 'A very very very very very very very long title.'
      }]
    };

    for (let i = 1; i < 50; i++) {
      this.state.items.push({
        id: 'I-' + i,
        title: 'Item ' + i
      });
    }

    this.itemRenderer = (item) => (
      <ListItem item={ item }>
        <ListItem.Icon icon="person_outline"/>
        <ListItem.Title/>
        <ListItem.Icon icon="edit"/>
      </ListItem>
    );
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
      <div className="ux-column">
        <div className="ux-bar">
          <h1 className="ux-expand">Test View</h1>
        </div>

        <div className="ux-row ux-data-row">
          <TextBox className="ux-expand"
                   value={ this.state.value }
                   autoFocus={ true }
                   onChange={ this.handleChange.bind(this) }/>
        </div>

        <div className="ux-row ux-data-row">
          <div className="ux-text ux-text-nocollapse">{ this.state.value }</div>
        </div>

        <div className="ux-expand">
          <List items={ this.state.items }
                itemRenderer={ this.itemRenderer }
                onItemSelect={ this.handleSelect.bind(this) }/>
        </div>

        <div className="ux-bar">
          <div className="ux-text-nocollapse ux-text-nowrap">{ this.state.item && JSON.stringify(this.state.item) }</div>
        </div>
      </div>
    );
  }
}
