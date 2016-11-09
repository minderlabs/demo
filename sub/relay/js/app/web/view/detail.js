//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import CreateItemMutation from '../../../common/mutations/create_item';

import ItemDetail from '../../../common/components/web/item_detail';

import Path from '../path';

/**
 * Item Detail view.
 */
class ItemDetailView extends React.Component {

  static childContextTypes = {
    itemCreator: React.PropTypes.func,
    itemSelector: React.PropTypes.func,
  };

  static contextTypes = {
    router: React.PropTypes.object,
  };

  static propTypes = {
    viewer: React.PropTypes.object.isRequired
  };

  getChildContext() {
    return {
      itemCreator: this.handleItemCreate.bind(this),
      itemSelector: this.handleItemSelect.bind(this)
    }
  }

  handleItemCreate(item) {

    // TODO(burdon): Relay can't handle local state (to satisfy fragments).
    // https://github.com/facebook/relay/issues/114
    // https://github.com/facebook/relay/issues/106 (=> Use Flux for local state)

    // TODO(burdon): Options:
    // Patch and wait for Relay 2: https://facebook.github.io/react/blog/2016/08/05/relay-state-of-the-state.html
    // Middleware: https://github.com/nodkz/react-relay-network-layer
    // - https://github.com/facebook/relay/issues/114 (Dec 28 @josephsavona)
    // Redux (liable to be replaced by Relay 2?)
    // - https://github.com/reactjs/redux/issues/464
    // - https://github.com/reactjs/redux/issues/775
    // Apollo (Relay promises mobile first).
    // - https://github.com/apollostack/apollo-client/pull/7/files?short_path=83772ba
    // - OFFLINE: https://github.com/apollostack/apollo-client/issues/424

    // TODO(burdon): If we stay with edges, how would we do this optimistically?
    let mutation = new CreateItemMutation({
      viewer: this.props.viewer,
      type:   item.type,
      title:  item.title || '',
      data:   item.data
    });

    // TODO(burdon): Currently need to commit "ghost" item then nav (so can fulfill fragment).
    this.props.relay.commitUpdate(mutation, {
      onSuccess: (result) => {
        let itemId = result.createItemMutation.itemEdge.node.id;

        // Navigate.
        this.context.router.push(Path.detail(itemId));
      }
    });
  }

  handleItemSelect(item) {
    this.context.router.push(Path.detail(item.id));
  }

  handleClose() {
    this.context.router.goBack();
  }

  render() {
    let { viewer, item } = this.props;

    // Redirect to home page if not found.
    if (!item) {
      this.context.router.push(Path.HOME);
    }

    return (
      <div className="app-column app-expand">
        <ItemDetail viewer={ viewer } item={ item } onClose={ this.handleClose.bind(this) }/>
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

        ${CreateItemMutation.getFragment('viewer')}
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
