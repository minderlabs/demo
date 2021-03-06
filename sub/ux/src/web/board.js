//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';

import { MutationUtil } from 'minder-core';

import { DragOrderModel } from './dnd';
import { DragDropList } from './list';
import { TextBox } from './textbox';

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
    items: PropTypes.array.isRequired,              // [{ id: {string}, title: {string} }]
    itemOrderModel: PropTypes.object.isRequired,    // [{DragOrderModel}]
    itemRenderer: PropTypes.func,
    columns: PropTypes.array.isRequired,            // [{ id: {string}, title: {string} }]
    columnMapper: PropTypes.func.isRequired,        // (columns, item) => column.id
    onItemSelect: PropTypes.func,                   // (item) => {}
    onItemUpdate: PropTypes.func,                   // (item, mutations) => {}
    onItemDrop: PropTypes.func                      // (column, item) => {}
  };

  static defaultProps = {
    itemOrderModel: new DragOrderModel()
  };

  state = {
    items: this.props.items,
    columns: this.props.columns
  };

  componentWillReceiveProps(nextProps) {
    this.setState({
      items: nextProps.items,
      columns: nextProps.columns
    })
  }

  handleItemSelect(item) {
    this.props.onItemSelect && this.props.onItemSelect(item);
  }

  handleItemDrop(listId, itemId, changes) {
    console.assert(listId && itemId);
    let { items, columns } = this.state;

    let column = _.find(columns, column => column.id === listId);
    let item = _.find(items, item => item.id === itemId);
    console.assert(item);

    this.props.onItemDrop && this.props.onItemDrop(column, item, changes);
  }

  handleItemCreate(column, text, textbox) {
    textbox.value = '';

    if (text) {
      this.props.onItemUpdate && this.props.onItemUpdate(null, [
        MutationUtil.createFieldMutation('title', 'string', text)
      ], column);
    }
  }

  render() {
    let { columnMapper, itemRenderer, itemOrderModel } = this.props;
    let { items, columns } = this.state;

    //
    // Columns.
    //
    let columnsDivs = columns.map(column => {

      // Get items for column (in order).
      let columnItems = _.filter(items, item => column.id === columnMapper(columns, item));

      return (
        <div key={ column.id } className="ux-board-column">
          <div className="ux-board-header ux-text-noselect">
            <h2>{ column.title }</h2>
          </div>

          <DragDropList className="ux-board-list"
                        highlight={ false }
                        data={ column.id }
                        items={ columnItems }
                        itemClassName="ux-board-list-item"
                        itemRenderer={ itemRenderer }
                        itemOrderModel={ itemOrderModel }
                        onItemDrop={ this.handleItemDrop.bind(this) }
                        onItemSelect={ this.handleItemSelect.bind(this) }/>

          <div className="ux-toolbar">
            <TextBox className="ux-expand"
                     placeholder="Add Card..."
                     onEnter={ this.handleItemCreate.bind(this, column) }/>
          </div>
        </div>
      );
    });

    return (
      <div className="ux-board ux-scroll-container">
        <div className="ux-scroll-x-panel">
          <div className="ux-board-columns">
            { columnsDivs }
          </div>
        </div>
      </div>
    );
  }
}
