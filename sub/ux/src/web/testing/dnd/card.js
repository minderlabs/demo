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
    id: React.PropTypes.string.isRequired,
    title: React.PropTypes.string.isRequired,
    meta: React.PropTypes.string,

    // Injected by React DnD.
    isDragging: React.PropTypes.bool.isRequired,
    connectDragSource: React.PropTypes.func.isRequired
  };

  render() {
    let { meta, title, connectDragSource, isDragging } = this.props;

    let metaDiv = meta && <div className="meta">{ meta }</div>;

    return connectDragSource(
      <div className={ 'card' + (isDragging ? ' dragging' : '') }>
        <h1>{ title }</h1>

        { metaDiv }
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
      id: props.id
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
