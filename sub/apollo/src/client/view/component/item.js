//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import Fragment from 'graphql-fragments';
import gql from 'graphql-tag';

/**
 * Defines properties needed by Item.
 * NOTE: External definition used by static propTypes.
 *
 * @type {{item}}
 */
const Fragments = {

  // https://github.com/apollostack/graphql-fragments
  // http://dev.apollodata.com/core/fragments.html
  // http://dev.apollodata.com/react/fragments.html

  item: new Fragment(gql`
    fragment ItemFragment on Item {
      id
      type
      labels
      title
    }
  `)

};

/**
 * Item.
 */
export class Item extends React.Component {

  /**
   * Fragments.
   */
  static Fragments = Fragments;

  static propTypes = {
    item: Fragments.item.propType,
    onSelect: React.PropTypes.func.isRequired,
    onLabelUpdate: React.PropTypes.func.isRequired
  };

  handleSelect() {
    this.props.onSelect(this.props.item);
  }

  handleToggleFavorite() {
    let { item } = this.props;
    this.props.onLabelUpdate(item, '_favorite', _.indexOf(item.labels, '_favorite') == -1);
  }

  render() {
    let { item, icon } = this.props;

    return (
      <div className="app-list-item app-row">
        <i className="material-icons"
           onClick={ this.handleToggleFavorite.bind(this) }>
          { _.indexOf(item.labels, '_favorite') == -1 ? 'star_border' : 'star' }
        </i>

        <div className="app-expand"
           onClick={ this.handleSelect.bind(this) }>{ item.title }
        </div>

        <i className="material-icons">{ icon }</i>
      </div>
    );
  }
}
