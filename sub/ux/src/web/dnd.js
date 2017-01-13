//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { DragSource, DropTarget } from 'react-dnd';

/**
 * Drag container wraps the list item.
 *
 * <ItemDragContainer>
 *   <ListItem/>
 * </ItemDragContainer>
 */
class ItemDragContainer extends React.Component {

  static propTypes = {
    data: React.PropTypes.string.isRequired,                    // Item ID.

    // Injected by React DnD.
    isDragging: React.PropTypes.bool.isRequired,
    connectDragSource: React.PropTypes.func.isRequired
  };

  render() {
    let { children, connectDragSource, isDragging } = this.props;

    let className = 'ux-drag-source' + (isDragging ? ' ux-dragging' : '');

    return connectDragSource(
      <div className={ className }>
        { children }
      </div>
    );
  }
}

//
// http://gaearon.github.io/react-dnd/docs-drag-source.html
//

const dragSpec = {
  beginDrag(props) {
    let item = {
      id: props.data
    };
    console.log('Drag: ' + JSON.stringify(item));
    return item;
  }
};

const dragCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

export const ItemDragSource = (type) => DragSource(type, dragSpec, dragCollect)(ItemDragContainer);

/**
 * Drop zone wraps the drop zone placeholder (which typically contains a ItemContainer).
 *
 * <ItemDropContainer>
 *   <ItemDragContainer>
 *     <ListItem/>
 *   </ItemDragContainer>
 * </ItemDropContainer>
 */
class ItemDropContainer extends React.Component {

  static propTypes = {
    data: React.PropTypes.string.isRequired,                    // ID of drop zone.
    order: React.PropTypes.number.isRequired,                   // Order within drop zone.
    onDrop: React.PropTypes.func.isRequired,                    // (itemId) => {}
  };

  render() {
    let { children, order, connectDropTarget, isOver } = this.props;

    let className = 'ux-drop-target' + (isOver ? ' ux-active' : '') + (children ? '' : ' ux-last');

    return connectDropTarget(
      <div className={ className }>
        <div className="ux-drop-placeholder">{ order }</div>

        { children }
      </div>
    );
  }
}

//
// http://gaearon.github.io/react-dnd/docs-drop-target.html
//

const dropSpec = {
  drop(props, monitor, connect) {
    let { data, order } = props;
    let item = monitor.getItem();
    console.log('Drop: ' + JSON.stringify(item), data, order);
    props.onDrop(item, data, order);
  }
};

const dropCollect = (connect, monitor) => ({

  // Call this function inside render() to let React DnD handle the drag events.
  connectDropTarget: connect.dropTarget(),

  // Drag state.
  isOver: monitor.isOver(),
  isOverCurrent: monitor.isOver({ shallow: true }),
  canDrop: monitor.canDrop(),
  itemType: monitor.getItemType()
});

export const ItemDropTarget = (type) => DropTarget(type, dropSpec, dropCollect)(ItemDropContainer);

/**
 * Stores mapping of items to column (with position).
 *
 * Each item (ID) is associated with a listId and a floating-point order.
 * In the list, each drop zone is assigned an order midway between successive items.
 * When an item is inserted (i.e., dropped onto a drop zone), the new order is midway between the drop zone and then
 * next item in the list.
 */
export class DragOrderModel {

  /**
   * Splits the difference between two floats.
   * https://docs.python.org/3/tutorial/floatingpoint.html
   */
  static split(a, b) {
    return a + (b - a) / 2;
  }

  constructor() {
    // Map of {
    //   order: {float} order within column.
    //   listId: {string} ID of container list.
    // } by Item ID.
    this._itemState = new Map();
  }

  // TODO(burdon): Serialize to GraphQL Type?

  parse(json) {
    let obj = JSON.parse(json);
    this._itemState.clear();
    _.each(obj, (order, itemId) => {
      this._itemState.set(itemId, {
        order
      });
    });
  }

  serialize() {
    let json = {};
    this._itemState.forEach((state, itemId) => { json[itemId] = state.order });
    return JSON.stringify(json);
  }

  /**
   * Updates the order of each item.
   * Items are inserted in order between existing ordered items.
   * If an item has changed it's column association, then it is re-ordered.
   *
   * @param items
   * @param listId
   */
  update(items, listId) {
    let previousOrder = 0;
    for (let i = 0; i < _.size(items); i++) {
      let item = items[i];
      let state = this._itemState.get(item.id);

      // Repair listId (e.g., after deserializing).
      if (state && _.isNil(state.listId)) {
        state.listId = listId;
      }

      // Check has a currently valid order.
      if (!state || state.listId != listId) {

        // Find next valid order value.
        let nextOrder = previousOrder + 1;
        for (let j = i + 1; j < _.size(items); j++) {
          let nextState = this._itemState.get(items[j].id);
          if (nextState && nextState.listId == listId) {
            nextOrder = nextState.order;
            break;
          }
        }

        // Calculate our order.
        state = {
          listId,
          order: DragOrderModel.split(previousOrder, nextOrder)
        };

        this._itemState.set(item.id, state);
      }

      previousOrder = state.order;
    }
  }

  /**
   * Sets the order of the given item between the drop target and the next item.
   *
   * @param itemId
   * @param listId
   * @param dropOrder
   */
  setOrder(itemId, listId, dropOrder) {
    // Get current orders for items in this list.
    let states = _.sortBy(
      _.filter(Array.from(this._itemState.values()), state => state.listId == listId), state => state.order);

    // Find the next item and the midpoint.
    let next = _.find(states, state => state.order > dropOrder);
    let order = DragOrderModel.split(dropOrder, next ? next.order : dropOrder + 1);

    // Set the state.
    this._itemState.set(itemId, {
      order,
      listId: listId
    });
  }

  getOrder(itemId) {
    let state = this._itemState.get(itemId);
    return state && state.order || 0;
  }

  getOrderedItems(items) {
    return _.sortBy(items, item => this.getOrder(item.id));
  }
}
