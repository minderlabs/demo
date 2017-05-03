//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';
import { DragSource } from 'react-dnd';

/**
 * Draggable card.
 */
class CardDrag extends React.Component {

  static propTypes = {
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    meta: PropTypes.string,

    // Injected by React DnD.
    isDragging: PropTypes.bool.isRequired,
    connectDragSource: PropTypes.func.isRequired
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
const dragSpec = {
  beginDrag(props) {
    console.log('Drag: ' + props.id);
    return {
      id: props.id
    };
  }
};

/**
 * Specifies the props to inject into your component.
 */
const dragCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

export default DragSource('CARD', dragSpec, dragCollect)(CardDrag);
