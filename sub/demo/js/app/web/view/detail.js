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
    if (!item) {
      this.context.router.push(Path.HOME);
    }

    return (
      <div className="app-column app-expand">
        <ItemDetail viewer={ viewer } item={ item }/>
      </div>
    );
  }
}

export default Relay.createContainer(ItemDetailView, {

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        ${ItemDetail.getFragment('viewer')}
      }
    `,

    item: (variables) => Relay.QL`
      fragment on Item {
        id
        type

        ${ItemDetail.getFragment('item')}
      }
    `
  }
});
