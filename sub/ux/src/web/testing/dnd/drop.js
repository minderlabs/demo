//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { DropTarget } from 'react-dnd';

/**
 * Drop position.
 */
class CardDrop extends React.Component {

  // TODO(burdon): Dragging over the item (not drop-zone should move the drop-zone).

  static propTypes = {
    emitter: React.PropTypes.object.isRequired,

    previous: React.PropTypes.string,
    pos: React.PropTypes.number.isRequired,
    label: React.PropTypes.string.isRequired
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

  render() {
    let { children, connectDropTarget, isOver } = this.props;
    let { pos } = this.state;

    let className = 'drop-target' + (isOver ? ' active' : '') + (children ? '' : ' last');
    return connectDropTarget(
      <div className={ className }>
        <div className="placeholder">
          {/*
          <span className="dashing"><i></i></span>
          <span className="dashing"><i></i></span>
          <span className="dashing"><i></i></span>
          <span className="dashing"><i></i></span>
          */}
        </div>

        { children }
      </div>
    );
  }
}

/**
 * Drop target contract.
 */
const dropSpec = {

  // Determine if drop is allowed.
  canDrop(props, monitor) {
    return true;
  },

  // Drag side-effects.
  hover(props, monitor, component) {
  },

  // On drop.
  drop(props, monitor, component) {
    let { emitter, previous, pos, label } = props;
    let item = monitor.getItem();

    console.log('Drop: ' + item.id, label, pos);

    // Can't drop onto placeholder for self.
    if (previous != item.id) {

      // NOTE: Observer patter is required to repaint from the root. Otherwise:
      // warning.js?8a56:36 Warning: setState(...):
      // Cannot update during an existing state transition (such as within `render` or another component's constructor).
      // Render methods should be a pure function of props and state;
      // constructor side-effects are an anti-pattern, but can be moved to `componentWillMount`.
      emitter.emit('drop', item.id, label, pos);
    }
  }
};

/**
 * Injects properties into the component.
 *
 * @param connect
 * @param monitor
 */
const dropCollect = (connect, monitor) => ({

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
export default DropTarget('CARD', dropSpec, dropCollect)(CardDrop);
