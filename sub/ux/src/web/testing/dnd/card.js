//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { DragSource } from 'react-dnd';

/**
 * Draggable card.
 */
class Card extends React.Component {

  static propTypes = {
    text: React.PropTypes.string.isRequired,

    // Injected by React DnD.
    isDragging: React.PropTypes.bool.isRequired,
    connectDragSource: React.PropTypes.func.isRequired
  };

  render() {
    let { text, connectDragSource, isDragging } = this.props;

    return connectDragSource(
      <div className={ 'card' + (isDragging && 'dragging' || '') }>
        { text }
      </div>
    );
  }
}

/**
 * Implements the drag source contract.
 */
const cardSource = {
  beginDrag(props) {
    return {
      text: props.text
    };
  }
};

/**
 * Specifies the props to inject into your component.
 */
function collect(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  };
}

export default DragSource('CARD', cardSource, collect)(Card);
