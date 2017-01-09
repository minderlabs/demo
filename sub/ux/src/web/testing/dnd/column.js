//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { DropTarget } from 'react-dnd';

/*
 * Drop Columns.
 */
class Column extends React.Component {

  componentWillReceiveProps(nextProps) {
    // TODO(burdon): Get drag state.
  }

  render() {
    let { connectDropTarget } = this.props;

    return connectDropTarget(
      <div className="column"></div>
    )
  }
}

/**
 * Drop target contract.
 */
const target = {

  // Determine if drop is allowed.
  canDrop(props, monitor) {
    return true;
  },

  // Drag side-effects.
  hover(props, monitor, component) {
  },

  // On drop.
  drop(props, monitor, component) {
    const item = monitor.getItem();
    console.log('Dropped', item);
  }
};

/**
 * Injects properties into the component.
 *
 * @param connect
 * @param monitor
 */
const collect = (connect, monitor) => ({

  // Call this function inside render() to let React DnD handle the drag events.
  connectDropTarget: connect.dropTarget(),

  // Drag state.
  isOver: monitor.isOver(),
  isOverCurrent: monitor.isOver({ shallow: true }),
  canDrop: monitor.canDrop(),
  itemType: monitor.getItemType()
});

/**
 * http://gaearon.github.io/react-dnd/docs-drop-target.html
 */
export default DropTarget('CARD', target, collect)(Column);
