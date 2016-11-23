//
// Copyright 2016 Minder Labs.
//

'use strict';

import { Picker } from 'minder-ux';

// TODO(burdon): Rename wrapper.
import ListQuery from './list_query';

class ListPicker extends Picker {

  handleTextChange(text) {

    // Update filter.
    this.props.refetch(_.assign({}, this.props.filter, { text: text }));
  }
}

export default ListQuery(ListPicker);
