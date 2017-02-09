//
// Copyright 2016 Minder Labs.
//

import React from 'react';

/**
 * Type registry.
 *
 * Manages layout for different types.
 */
export class TypeRegistry {

  // TODO(burdon): Rename.
  // TODO(burdon): Rationalize canvas/card/compact, etc.
  // TODO(burdon): Project has 2 canvas types.
  // TODO(burdon): Task needs card + canvas
  // TODO(burdon): Clean-up <CardContainer> + <CanvasContainer>
  // TODO(burdon): Use Card in Board (by type).
  // TODO(burdon): Org type (with contacts)
  // TODO(burdon): Org board.

  // - card (compact)
  // - canvas (default canvas)
  // - canvas/board (alt canvases)

  /**
   * System singleton.
   * @param types Map of type specs.
   */
  constructor(types) {
    this._types = new Map(types);
  }

  // TODO(burdon): Rename card.
  compact(item) {
    console.assert(item);
    let spec = this._types.get(item.type);
    if (spec) {
      let gen = _.get(spec.canvas, 'compact');
      return gen && gen(item);
    }
  }

  /**
   * Canvas component for page view.
   *
   * @param type
   * @param itemId
   * @param canvas
   * @returns {XML}
   */
  canvas(type, itemId, canvas='card') {
    console.assert(type && itemId);
    let spec = this._types.get(type);
    if (spec) {
      let gen = _.get(spec.canvas, canvas);
      return gen && gen(itemId);
    }
  }

  /**
   * Custom list column for list view.
   *
   * @returns {React.Component}
   */
  column(item) {
    console.assert(item);
    let spec = this._types.get(item.type);
    return spec && spec.column && spec.column(item) || null;
  }

  /**
   * material-icons icon.
   *
   * @param item
   * @return {V|icon|(function(*): string)|string|TypeRegistry.icon|string|*|*}
   */
  icon(item) {
    console.assert(item);
    let spec = this._types.get(item.type);
    return spec && spec.icon || '';
  }
}
