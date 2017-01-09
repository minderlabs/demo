//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import Column from './column';

import './canvas.less';

//
// DND test.
// http://gaearon.github.io/react-dnd/docs-tutorial.html
//

/**
 * Card canvas.
 */
class TestCanvas extends React.Component {

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

export default DragDropContext(HTML5Backend)(TestCanvas);
