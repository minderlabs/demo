//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import { Database } from '../../data/database';
import UpdateItemMutation from '../../data/mutations/update_item';

import TypeRegistry from './type_registry';

import './item.less';

/**
 * Compact view of an Item.
 */
class Item extends React.Component {

  static propTypes = {
    viewer: React.PropTypes.object.isRequired,
    item:   React.PropTypes.object.isRequired,
    filter: React.PropTypes.object.isRequired
  };

  handleToggleFavorite(event) {
    event.stopPropagation();

    let { viewer, item } = this.props;

    // TODO(burdon): Call context mutator.
    let mutation = new UpdateItemMutation({
      viewer: viewer,
      item: item,
      labels: [{
        index: _.indexOf(item['labels'], Database.LABEL.FAVORITE) == -1 ? 0 : -1,
        value: Database.LABEL.FAVORITE
      }]
    });

    this.props.relay.commitUpdate(mutation);
  }

  render() {
    let { item } = this.props;

    let icon = TypeRegistry.icon(item.type);

    return (
      <div>
        <i className="app-icon app-icon-medium app-icon-star material-icons"
           onClick={ this.handleToggleFavorite.bind(this) }>
          { _.indexOf(item['labels'], Database.LABEL.FAVORITE) != -1 ? 'star': 'star_border' }
        </i>

        <div className="app-expand">
          <div className="app-field-title">{ item.title }</div>
          <div className="app-debug">{ item.snippet }</div>
        </div>

        <i className="app-icon app-icon-medium app-icon-type material-icons">{ icon }</i>
      </div>
    );
  }
}

export default Relay.createContainer(Item, {

  initialVariables: {
    filter: {},
    text: ''
  },

  prepareVariables: (variables) => {
    return {
      ...variables,
      text: variables.filter.text
    }
  },

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        ${UpdateItemMutation.getFragment('viewer')}
      }
    `,

    item: (variables) => Relay.QL`      
      fragment on Item {
        id
        type
        title
        labels

        snippet(text: $text)

        ${UpdateItemMutation.getFragment('item')}
      }
    `
  }
});
