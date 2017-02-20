//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { ID } from 'minder-core';

import { ItemCard, ItemCanvas } from '../type/item';

/**
 * The type registry provides definitions and factories for typed components.
 */
export class TypeRegistry {

  // TODO(burdon): Move to minder-ux (with Card, Cavnas).

  /**
   * System singleton.
   * @param types Map of type specs.
   */
  constructor(types) {
    this._types = new Map();
    _.each(types, (value, key) => {
      this._types.set(key, value);
    });
  }

  /**
   * material-icons icon.
   *
   * @param item
   * @return {string}
   */
  icon(item) {
    console.assert(item && item.type);
    let spec = this._types.get(item.type);
    return spec && spec.icon || '';
  }

  /**
   * Custom list column for list view.
   *
   * @returns {React.Component}
   */
  column(item) {
    console.assert(item && item.type);
    let spec = this._types.get(item.type);
    return spec && spec.column && spec.column(item) || null;
  }

  /**
   * Card view.
   * Cards are displayed inline in lists which retrieve the data items, therefore they are low-level
   * components which are passed the item object (contrast with canvas below).
   *
   * @param item Data item.
   * @return {*}
   */
  card(item) {
    console.assert(item && item.type);
    let spec = this._types.get(item.type);
    if (spec) {
      let factory = _.get(spec, 'card');
      return factory && factory(item);
    }

    // Default.
    return <ItemCard item={ item }/>;
  }

  /**
   * Canvas view.
   * Canvases declare their own HOC to retrieve data, hence only the root Item ID is supplied.
   *
   * @param itemId Item ID used to parameterize HOC.
   * @param canvas
   * @returns {XML}
   */
  canvas(itemId, canvas='def') {
    console.assert(itemId);
    let { type } = ID.fromGlobalId(itemId);
    let spec = this._types.get(type);
    if (spec) {
      // TODO(burdon): Default item canvas.
      let factory = _.get(spec.canvas, canvas);
      return factory && factory(itemId);
    }

    // Default.
    return <ItemCanvas itemId={ itemId }/>;
  }
}
