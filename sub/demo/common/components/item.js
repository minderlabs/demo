//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

class Item extends React.Component {
  render() {
    const {item} = this.props;
    console.log('ITEM: ' + JSON.stringify(item));
    return <div key="{item.id}">{item.title} (ID: {item.id})</div>;
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
