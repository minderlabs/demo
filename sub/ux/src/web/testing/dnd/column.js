//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { DropTarget } from 'react-dnd';

import Card from './card';

/*
 * Columns (Drop target).
 */
class Column extends React.Component {

  static propTypes = {
    label: React.PropTypes.string.isRequired,
    items: React.PropTypes.array.isRequired
  };

  componentWillReceiveProps(nextProps) {
  }

  render() {
    let { items, label, connectDropTarget, isOver } = this.props;

    let cards = items.map(item => (
      <Card key={ item.id } id={ item.id } title={ item.title }/>
    ));

    let dropTarget = connectDropTarget(
      <div className="drop-target">
        { cards }
      </div>
    );

    return (
      <div className={ 'column' + (isOver ? ' highlight' : '') }>
        <div className="header">{ label }</div>

        { dropTarget }
      </div>
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
    let item = monitor.getItem();
    props.emitter.emit('drop', item.id, props.label);

    // TODO(burdon): Observer pattern.
    // TODO(burdon): Triggers setState (but model changed).
    // warning.js?8a56:36 Warning: setState(...):
    // Cannot update during an existing state transition (such as within `render` or another component's constructor).
    // Render methods should be a pure function of props and state;
    // constructor side-effects are an anti-pattern, but can be moved to `componentWillMount`.
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
