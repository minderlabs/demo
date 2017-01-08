//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { List } from './list';

import './board.less';

/**
 * Board component.
 */
export class Board extends React.Component {

  static propTypes = {
    item: React.PropTypes.object,
    items: React.PropTypes.array,
    columns: React.PropTypes.array,
    columnMapper: React.PropTypes.func
  };

  render() {
    let { item={}, items, columns, columnMapper } = this.props;

    let columnsDivs = columns.map(board => {
      let columnItems = [];
      _.each(items, item => {
        if (board == columnMapper(columns, item)) {
          columnItems.push(item);
        }
      });

      // TODO(burdon): Drag and drop (can't use list?)

      return (
        <div key={ board.id } className="ux-board-column">
          <div className="ux-board-header ux-text-noselect">{ board.title }</div>
          <div className="ux-board-list">
            <List items={ columnItems }/>
          </div>
        </div>
      );
    });

    // TODO(burdon): Title in Breadcrumbs.
    return (
      <div className="ux-board">
        <div className="ux-board-header">
          <div>{ item.title }</div>
        </div>

        <div className="ux-board-columns ux-scroll-x-container">
          { columnsDivs }
        </div>
      </div>
    );
  }
}
