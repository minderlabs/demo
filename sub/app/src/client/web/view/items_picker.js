//
// Copyright 2016 Minder Labs.
//

import { ItemsQueryWrapper } from 'minder-core';

import { Picker } from 'minder-ux';

/**
 * Subclass picker to create items query fitler.
 */
class ItemsPicker extends Picker {

  // TODO(burdon): Wrap instead of extend?
  handleTextChange(text) {
    super.handleTextChange(text);

    // Update filter.
    this.props.refetch(_.assign({}, this.props.filter, { text }));
  }
}

export const FilteredItemsPicker = ItemsQueryWrapper(ItemsPicker);
