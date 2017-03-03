//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { ItemCard, ItemCanvas } from '../type/item';

/**
 * The type registry provides definitions and factories for typed components.
 */
export class TypeRegistry {

  /**
   * System singleton.
   * @param types Map of type specs.
   */
  constructor(types) {
    this._types = types;
  }

  /**
   * material-icons icon.
   *
   * @param type Item type.
   * @return {string} Icon name.
   */
  icon(type) {
    console.assert(type);
    return _.get(this._types, `${type}.icon`);
  }

  /**
   * Custom list column for list view.
   *
   * @param type Item type.
   */
  column(type) {
    console.assert(type);
    return _.get(this._types, `${type}.column`);
  }

  /**
   * Card view.
   * Cards are displayed inline in lists which retrieve the data items, therefore they are low-level
   * components which are passed the item object (contrast with canvas below).
   *
   * @param type Item type.
   */
  card(type) {
    console.assert(type);
    return _.get(this._types, `${type}.card`, ItemCard);
  }

  /**
   * Canvas view.
   * Canvases declare their own HOC to retrieve data, hence only the root Item ID is supplied.
   *
   * @param type Item type.
   * @param {string} canvas Canvas type.
   */
  canvas(type, canvas='def') {
    console.assert(type);
    return _.get(this._types, `${type}.canvas.${canvas}`, ItemCanvas);
  }

  /**
   * Canvas toolbar.
   *
   * @param type Item type.
   */
  toolbar(type) {
    console.assert(type);
    return _.get(this._types, `${type}.toolbar`);
  }
}
