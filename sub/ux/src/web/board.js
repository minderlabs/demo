//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { DragOrderModel } from './dnd';
import { DragDropList } from './list';

import './board.less';

/**
 * Board component.
 *
 * <Board onItemDrop={ ... }>
 *   <List data="column-1" onItemDrop={ ... }>
 *     <DropTarget data="column-1" onDrop={ ... }>
 *       <DragSource data="item-1">
 *         <ListItem>
 */
export class Board extends React.Component {

  static propTypes = {
    items: React.PropTypes.array.isRequired,              // [{ id: {string}, title: {string} }]
    itemOrderModel: React.PropTypes.object.isRequired,    // [{DragOrderModel}]
    columns: React.PropTypes.array.isRequired,            // [{ id: {string}, title: {string} }]
    columnMapper: React.PropTypes.func.isRequired,        // (columns, item) => column.id
    onItemSelect: React.PropTypes.func,                   // (item) => {}
    onItemDrop: React.PropTypes.func                      // (column, item) => {}
  };

  static defaultProps = {
    itemOrderModel: new DragOrderModel()
  };

  constructor() {
    super(...arguments);

    this.state = {
      items: this.props.items,
      columns: this.props.columns
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      items: nextProps.items,
      columns: nextProps.columns
    })
  }

  handleItemSelect(item) {
    this.props.onItemSelect && this.props.onItemSelect(item);
  }

  handleItemDrop(list, itemId) {
    console.assert(list && itemId);
    let { items, columns } = this.state;

    let columnId = list.props.data;
    let column = _.find(columns, column => column.id == columnId);
    let item = _.find(items, item => item.id === itemId);

    this.props.onItemDrop && this.props.onItemDrop(column, item);
  }

  render() {
    let { columnMapper, itemOrderModel } = this.props;
    let { items, columns } = this.state;

    // Columns.
    let columnsDivs = columns.map(column => {

      // TODO(burdon): BoardModel manages ordering?
      // Get items for column (in order).
      let columnItems = _.filter(items, item => column.id == columnMapper(columns, item));

      return (
        <div key={ column.id } className="ux-board-column">
          <div className="ux-board-header ux-text-noselect">{ column.title }</div>
          <div className="ux-board-list">
            <DragDropList data={ column.id }
                          items={ columnItems }
                          itemOrderModel={ itemOrderModel }
                          onItemDrop={ this.handleItemDrop.bind(this) }
                          onItemSelect={ this.handleItemSelect.bind(this) }/>
          </div>
        </div>
      );
    });

    return (
      <div className="ux-board">
        <div className="ux-scroll-x-container">
          <div className="ux-board-columns">
            { columnsDivs }
          </div>
        </div>
      </div>
    );
  }
}
