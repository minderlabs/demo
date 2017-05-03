//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import { Chance } from 'chance';
import { EventEmitter } from 'fbemitter';

import CardDrag from './drag';
import CardDrop from './drop';

import './board.less';

//
// DND test.
// http://gaearon.github.io/react-dnd/docs-tutorial.html
//

/**
 * Item model.
 * TODO(burdon): Wraps query.
 */
class ItemModel {

  constructor(labels=[], items=[]) {
    this.chance = new Chance(300);
    this.labels = labels;
    this.items = items;

    // Map of order floats indexed by Item ID.
    this.itemPos = {};

    _.each(items, item => this.setPos(item));
  }

  addItem(item) {
    this.items.push(item);
    this.setPos(item);
  }

  /**
   * Calculates the position of the item within the column.
   * @param item
   * @param {float} pos
   */
  setPos(item, pos=null) {
    if (pos === null) {
      // Get sorted items for column (without current).
      let items = _.filter(this.getItems(item.label), i => i.id !== item.id);
      let size = _.size(items);
      if (size === 0) {
        // First in column.
        pos = 1;
      } else {
        // Last in column.
        pos = this.itemPos[items[size - 1].id] + 1;
      }
    }

    // Set the order.
    // TODO(burdon): Track column ID (so position is reset if doen't match).
    //               I.e., metadata changed without dragging.
    this.itemPos[item.id] = pos;
  }

  getPos(id) {
    return this.itemPos[id];
  }

  getItem(id) {
    let idx = _.findIndex(this.items, item => item.id === id);
    return idx === -1 ? null : this.items[idx];
  }

  getItems(label) {
    // Get items in order.
    return _.sortBy(_.filter(this.items, item => item.label === label), item => this.itemPos[item.id]);
  }
}

/*
 * Columns.
 */
class Column extends React.Component {

  static propTypes = {
    model: PropTypes.object.isRequired,
    emitter: PropTypes.object.isRequired,
    label: PropTypes.string.isRequired,
    items: PropTypes.array.isRequired
  };

  render() {
    let { model, emitter, items, label } = this.props;

    let lastPos = 0;
    let lastId = null;
    let cards = items.map(item => {
      let currentPos = model.getPos(item.id);
      let div = (
        <CardDrop key={ item.id } emitter={ emitter }
                  label={ label } previous={ lastId } pos={ lastPos + (currentPos - lastPos) / 2 }>

          <CardDrag id={ item.id } title={ item.title } meta={ String('POS: ' + currentPos) }/>
        </CardDrop>
      );
      lastPos = currentPos;
      lastId = item.id;
      return div;
    });

    return (
      <div className='column'>
        <div className="header">{ label }</div>
        <div className="cards">
         { cards }

         <CardDrop emitter={ emitter } previous={ lastId } label={ label } pos={ lastPos + 0.5 }/>
        </div>
      </div>
    )
  }
}

/**
 * Board canvas.
 */
class TestDragBoard extends React.Component {

  constructor() {
    super(...arguments);

    // https://github.com/facebook/emitter
    this.emitter = new EventEmitter();
    this.emitter.addListener('drop', (id, label, pos) => {
      let item = this.model.getItem(id);
      item.label = label;
      this.model.setPos(item, pos);

      this.forceUpdate();
    });

    this.model = new ItemModel(['red', 'green', 'blue']);
    _.times(10, i => this.model.addItem({
      id: `I-${i + 1}`,
      title: `Item-${i + 1}`,
      label: this.model.chance.pickone(this.model.labels)
    }));
  }

  render() {
    let columns = this.model.labels.map(label =>
      <Column key={ label } emitter={ this.emitter } model={ this.model }
              items={ this.model.getItems(label) } label={ label }/>);

    return (
      <div className="board">
        { columns }
      </div>
    )
  }
}

export default DragDropContext(HTML5Backend)(TestDragBoard);
