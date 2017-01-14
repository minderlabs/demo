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
    order: React.PropTypes.number.isRequired,                   // Order within drop zone.

    // Injected by React DnD.
    isDragging: React.PropTypes.bool.isRequired,
    connectDragSource: React.PropTypes.func.isRequired
  };

  render() {
    let { children, order, connectDragSource, isDragging } = this.props;

    let className = 'ux-drag-source' + (isDragging ? ' ux-dragging' : '');

    return connectDragSource(
      <div className={ className }>
        <div className="ux-debug">{ order }</div>

        { children }
      </div>
    );
  }
}

//
// http://gaearon.github.io/react-dnd/docs-drag-source.html
//

const dragSpec = {

//canDrag() {
//  return false;
//},

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
        <div className="ux-drop-placeholder">
          <div className="ux-debug">{ order }</div>
        </div>

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
    //   listId: {string} ID of container list.
    //   order: {float} order within column.
    // } by Item ID.
    this._itemMeta = new Map();
  }

  /**
   * Sets the layout from the persisted set of mutations.
   * @param itemMeta
   */
  setLayout(itemMeta) {
    _.each(itemMeta, meta => {
      this._itemMeta.set(meta.itemId, {
        listId: meta.listId,
        order: meta.order
      });
    });
  }

  /**
   * Updates the order of each item.
   * Items are inserted in order between existing ordered items.
   * If an item has changed it's column association, then it is re-ordered.
   *
   * @param items
   * @param listId
   */
  doLayout(items, listId) {

    // Top drop zone is always order 0.
    let previousOrder = 0;
    for (let i = 0; i < _.size(items); i++) {
      let item = items[i];
      let meta = this._itemMeta.get(item.id);

      // TODO(burdon): Remove meta for items that are no longer present.
      // TODO(burdon): BUG: Should reset order if listId has changed. But frequent re-render makes this difficult to track.
      //               E.g., if column mapper metadata changed without dragging (elsewhere).
      //               Mutation must do optimistic update first (otherwise association will change before commit).

      // Repair listId (e.g., after deserializing).
      if (meta && _.isNil(meta.listId)) {
        meta.listId = listId;
      }

      // Check has a currently valid order.
      if (!meta) { // || meta.listId != listId) {

        // Find next valid order value.
        let nextOrder = previousOrder + 1;
        for (let j = i + 1; j < _.size(items); j++) {
          let nextMeta = this._itemMeta.get(items[j].id);
          if (nextMeta && nextMeta.listId == listId) {
            nextOrder = nextMeta.order;
            break;
          }
        }

        // Calculate our order.
        meta = {
          listId,
          order: DragOrderModel.split(previousOrder, nextOrder)
        };

        this._itemMeta.set(item.id, meta);
      }

      previousOrder = meta.order;
    }
  }

  /**
   * Sets the order of the given item between the drop target and the next item.
   *
   * This is complicated.
   * 1). When the board is first created, there is no meta. So items will be rendered in their "natural" order
   *     I.e., the order they are presented as props.
   * 2). Order metadata is only generated when needed. Initially, no meta exist; if an item is re-ordered, then
   *     metadata must be generated for ALL items that preceed it.
   * 3). When ordering occurs a vector of order mutations is generated.
   *
   * @param items Currently displayed items.
   * @param itemId Dropped item.
   * @param listId Current list ID.
   * @param dropOrder Order of drop zone.
   *
   * @return [{ id, order }] Mutations applied for this change.
   */
  setOrder(items, itemId, listId, dropOrder) {
    console.log('setOrder:', _.size(items), itemId, dropOrder);

    let changes = [];
    let sortedItems = this.getOrderedItems(items);

    let currentOrder = 0;
    for (let i = 0; i < _.size(sortedItems); i++) {
      let currentItem = sortedItems[i];

      // Check if the current item has metadata.
      let currentMeta = this._itemMeta.get(currentItem.id);
      if (currentMeta) {
        currentOrder = currentMeta.order;
      } else {
        currentOrder += 1;
      }

      // Check if we're being dropped above of the current item. If so, set and exit.
      if (dropOrder < currentOrder) {
        break;
      }

      // If no meta, then create it to fill-in previous items.
      if (!currentMeta) {
        changes.push(this._setOrder(currentItem.id, listId, currentOrder));
      }
    }

    changes.push(this._setOrder(itemId, listId, DragOrderModel.split(dropOrder, currentOrder)));

    return changes;
  }

  _setOrder(itemId, listId, order) {
    this._itemMeta.set(itemId, {
      listId,
      order
    });

    return {
      itemId,
      listId,
      order
    };
  }

  getOrder(itemId) {
    let meta = this._itemMeta.get(itemId);
    return meta && meta.order || 0;
  }

  getOrderedItems(items) {
    return _.sortBy(items, item => this.getOrder(item.id) || 999);
  }
}
