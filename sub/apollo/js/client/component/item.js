//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Fragment from 'graphql-fragments';
import gql from 'graphql-tag';


/**
 * Item.
 */
export class Item extends React.Component {

  static propTypes = {
    item: React.PropTypes.object.isRequired,
    onLabelUpdate: React.PropTypes.func.isRequired
  };

  handleToggleFavorite() {
    let { item } = this.props;

    this.props.onLabelUpdate(item, '_favorite', _.indexOf(item.labels, '_favorite') == -1);
  }

  render() {
    let { item } = this.props;

    return (
      <div className="app-list-item app-row">
        <i className="material-icons" onClick={ this.handleToggleFavorite.bind(this) }>
          { _.indexOf(item.labels, '_favorite') == -1 ? 'star_border' : 'star' }</i>
        <div className="app-expand">{ item.title }</div>
      </div>
    );
  }
}

//
// Queries
// TODO(burdon): Factor out bindings (keep component dry).
//

Item.fragments = {

  // http://dev.apollodata.com/react/fragments.html

  item: new Fragment(gql`
    fragment ItemFragment on Item {
      id
      title
      labels
    }
  `)

};

export default Item;
