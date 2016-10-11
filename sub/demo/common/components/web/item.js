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

  handleToggleStar() {
    // TODO(burdon): Fire redux action.
    console.log('Toggle star.');
  }

  // TODO(burdon): Item renderer is list specific?
  render() {
    const {item} = this.props;

    return (
      <div className="app-list-item">
        <i className="app-icon app-icon-medium app-icon-star material-icons"
           onClick={ this.handleToggleStar.bind(this) }>
          { item.status ? 'star': 'star_border' }
        </i>
        <div className="app-expand" title={ item.id }>{ item.title }</div>
        {/*
        <i className="app-icon app-icon-medium app-icon-edit material-icons">mode_edit</i>
        */}
      </div>
    );
  }
}

export default Relay.createContainer(Item, {
  fragments: {
    item: () => Relay.QL`
      fragment on Item {
        id,
        version,
        status,
        title
      }
    `
  }
});
