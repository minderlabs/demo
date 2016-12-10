//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';

import './list.less';

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
      <div className="ux-column ux-list">
        <div ref="items" className="ux-column ux-scroll-container">
          { items.map(item => this.props.itemRenderer(item)) }
        </div>
      </div>
    );
  }
}
