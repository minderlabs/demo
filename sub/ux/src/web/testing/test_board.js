//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { Board } from '../board';

/**
 * Test board.
 */
export default class TestBoard extends React.Component {

  // TODO(burdon): Demo with colored items (from MVP graph illustration).

  constructor() {
    super(...arguments);

    // TODO(burdon): Model base class (with state).
    this.state= {
      model: {
        columns: [
          {
            id: 'C-1',
            title: 'Column 1',
            label: 'red'
          },
          {
            id: 'C-2',
            title: 'Column 2',
            label: 'green'
          },
          {
            id: 'C-3',
            title: 'Column 3',
            label: 'blue'
          }
        ],

        items: [
          {
            id: 'I-1',
            title: 'Item 1',
            label: 'red'
          },
          {
            id: 'I-2',
            title: 'Item 2',
            label: 'red'
          },
          {
            id: 'I-3',
            title: 'Item 3',
            label: 'red'
          },
          {
            id: 'I-4',
            title: 'Item 4',
            label: 'red'
          },
          {
            id: 'I-5',
            title: 'Item 5',
            label: 'green'
          }
        ],

        columnMapper: (columns, item) => {
          let column = _.find(columns, column => column.label === item.label);
          return column && column.id;
        }
      }
    };
  }

  handleDrop(column, item, changes) {
    console.assert(column && item);

    // Change the list.
    item.label = column.label;

    // Rerender all lists.
    this.forceUpdate();

    console.log('Mutations: ' + JSON.stringify(changes));
  }

  render() {
    let { model } = this.state;

    return (
      <Board items={ model.items }
             columns={ model.columns }
             columnMapper={ model.columnMapper }
             onItemDrop={ this.handleDrop.bind(this) }/>
    );
  }
}
