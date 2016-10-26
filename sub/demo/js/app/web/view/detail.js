//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import ItemDetail from '../../../common/components/web/item_detail';

import Path from '../path';

/**
 * Item Detail view.
 */
class ItemDetailView extends React.Component {

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  //
  // Layout.
  //

  render() {
    let { viewer, item } = this.props;

    // Redirect to home page if not found.
    // TODO(burdon): Remove from history stack.
    if (!item) {
      this.context.router.push(Path.HOME);
    }

    return (
      <div className="app-panel-column">
        <div className="app-item-detail">
          <ItemDetail viewer={ viewer } item={ item }/>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(ItemDetailView, {

  fragments: {
    viewer: () => Relay.QL`
      fragment on Viewer {
        id
      }
    `,

    item: () => Relay.QL`
      fragment on Item {
        id
        type

        ${ItemDetail.getFragment('item')}
      }
    `,
  }
});
