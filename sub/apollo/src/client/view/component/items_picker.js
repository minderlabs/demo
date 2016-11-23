//
// Copyright 2016 Minder Labs.
//

'use strict';

import { ItemsQueryWrapper } from 'minder-core';

import { Picker } from 'minder-ux';

/**
 * Subclass picker to create items query fitler.
 */
class ItemsPicker extends Picker {

  handleTextChange(text) {
    super.handleTextChange(text);

    // Update filter.
    this.props.refetch(_.assign({}, this.props.filter, { text: text }));
  }
}

export default ItemsQueryWrapper(ItemsPicker);
