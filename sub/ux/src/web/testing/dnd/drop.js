//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { DropTarget } from 'react-dnd';

/**
 * Drop position.
 */
class Drop extends React.Component {

  // TODO(burdon): Card should be inside drop zone (bigger target).

  static propTypes = {
    emitter: React.PropTypes.object.isRequired,
    label: React.PropTypes.string.isRequired,
    pos: React.PropTypes.number.isRequired
  };

  constructor() {
    super(...arguments);

    this.state = {
      pos: this.props.pos
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.pos != this.state.pos) {
      this.setState({
        pos: nextProps.pos
      });
    }
  }

  // TODO(burdon): Add order.
  render() {
    let { connectDropTarget, isOver } = this.props;
    let { pos } = this.state;
    let className = 'drop-target' + (isOver ? ' active' : '');
    return connectDropTarget(
      <div className={ className } data={ pos }>{ pos }</div>
    );
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
    let { emitter, label, pos } = props;
    let item = monitor.getItem();

    emitter.emit('drop', item.id, label, pos);

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
export default DropTarget('CARD', target, collect)(Drop);
