//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import Card from './card';
import Drop from './drop';

/*
 * Columns.
 */
export default class Column extends React.Component {

  static propTypes = {
    model: React.PropTypes.object.isRequired,
    emitter: React.PropTypes.object.isRequired,
    label: React.PropTypes.string.isRequired,
    items: React.PropTypes.array.isRequired
  };

  render() {
    let { model, emitter, items, label } = this.props;

    let lastPos = 0;
    let cards = items.map(item => {
      let currentPos = model.getPos(item.id);
      let div = (
        <div key={ item.id }>
          <Drop emitter={ emitter } label={ label } pos={ lastPos + (currentPos - lastPos) / 2 }/>
          <Card id={ item.id } title={ item.title } meta={ String(currentPos) }/>
        </div>
      );
      lastPos = currentPos;
      return div;
    });

    return (
      <div className='column'>
        <div className="header">{ label }</div>
        <div>
         { cards }
         <Drop emitter={ emitter } label={ label } pos={ lastPos + 0.5 }/>
        </div>
      </div>
    )
  }
}
