//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import { Chance } from 'chance';
import { EventEmitter } from 'fbemitter';

import Column from './column';

import './canvas.less';

//
// DND test.
// http://gaearon.github.io/react-dnd/docs-tutorial.html
//

class ItemModel {

  // TODO(burdon): Maintain item order.

  constructor(labels=[], items=[]) {
    this.chance = new Chance(1000);
    this.labels = labels;
    this.items = items;
  }

  addItem(item) {
    this.items.push(item);
  }

  getItem(id) {
    let idx = _.findIndex(this.items, item => item.id == id);
    return idx == -1 ? null : this.items[idx];
  }

  getItems(label) {
    return _.filter(this.items, item => item.label == label)
  }
}

/**
 * Card canvas.
 */
class TestCanvas extends React.Component {

  constructor() {
    super(...arguments);

    // https://github.com/facebook/emitter
    this.emitter = new EventEmitter();
    this.emitter.addListener('drop', (id, label) => {
      this.model.getItem(id).label = label;
      this.forceUpdate();
    });

    this.model = new ItemModel(['red', 'green', 'blue']);
    _.times(6, i => this.model.addItem({
      id: `I-${i}`,
      title: `Item-${i}`,
      label: this.model.chance.pickone(this.model.labels)
    }));
  }

  render() {
    let columns = this.model.labels.map(label =>
      <Column key={ label } emitter={ this.emitter } items={ this.model.getItems(label) } label={ label }/>);

    return (
      <div className="canvas">
        { columns }
      </div>
    )
  }
}

export default DragDropContext(HTML5Backend)(TestCanvas);
