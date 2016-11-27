//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';

/**
 * Item List.
 */
export class List extends React.Component {

  // TODO(burdon): Not currently used.

  static propTypes = {
    itemRenderer: React.PropTypes.func.isRequired,
    items: React.PropTypes.array.isRequired
  };

  handleItemSelect(item) {
    this.props.onItemSelect(item);
  }

  render() {
    let { items=[] } = this.props;

    // TODO(burdon): Invisible input to allow cursor (see Picker).
    // TODO(burdon): Track scroll position in redux so that it can be restored.

    return (
      <div className="app-column app-list">
        <div ref="items" className="app-column app-scroll-container">
          { items.map(item => this.props.itemRenderer(item)) }
        </div>
      </div>
    );
  }
}
