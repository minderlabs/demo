//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import { DragSource } from 'react-dnd';

import 'test_dnd.less';

/**
 * Card canvas.
 */
export class Canvas extends React.Component {

  render() {
    return (
      <div className="canvas">
        <Column/>
        <Column/>
        <Column/>
      </div>
    )
  }
}

/*
 * Drop Columns.
 */
class Column extends React.Component {

  render() {
    return (
      <div className="column">
      </div>
    )
  }
}

/**
 * Draggable card.
 */
class Card extends React.Component {

  static propTypes = {
    text: propType.string.isRequired,

    // Injected by React DnD.
    isDragging: propType.bool.isRequired,
    connectDragSource: propType.func.isRequired
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
