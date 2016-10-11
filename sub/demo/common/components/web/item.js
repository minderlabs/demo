//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

/**
 * Generic data item.
 */
class Item extends React.Component {

  // TODO(burdon): Item renderer is list specific?
  render() {
    const {item} = this.props;
    return (
      <div className="app-list-item">
        <div className="app-key">{item.id}</div>
        <div>{item.title}</div>
      </div>
    );
  }
}

export default Relay.createContainer(Item, {
  fragments: {
    item: () => Relay.QL`
      fragment on Item {
        id,
        title
      }
    `
  }
});
