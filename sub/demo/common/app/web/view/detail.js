//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import Item from '../../../components/web/item';

import Path from '../path';

/**
 * Detail view.
 */
class DetailView extends React.Component {

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  //
  // Layout.
  //

  render() {
    let { user, item } = this.props;

    // Redirect to home page if not found.
    // TODO(burdon): Remove from history stack.
    if (!item) {
      this.context.router.push(Path.HOME);
    }

    return (
      <div className="app-panel-column">
        <div className="app-section app-debug">{ this.props.params.itemId }</div>

        <div className="app-section">
          <div className="app-list">
            <Item user={ user } item={ item }/>
          </div>
        </div>
      </div>
    );
  }
}

// TODO(burdon): Define specific fragment (move from DemoApp)?
// http://stackoverflow.com/questions/32756125/how-to-pass-variables-between-relay-containers

export default Relay.createContainer(DetailView, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        id,
      }
    `,

    item: () => Relay.QL`
      fragment on Item {
        id,
        title,
        status,

        ${Item.getFragment('item')}
      }
    `,
  }
});
