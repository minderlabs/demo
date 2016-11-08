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

  static contextTypes = {
    router: React.PropTypes.object
  };

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  //
  // Layout.
  //

  render() {
    let { viewer } = this.props;

    return (
      <div className="app-column app-expand">
        <h1>CREATE</h1>
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
    `
  }
});
