//
// Copyright 2016 Minder Labs.
//

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
 * List Item.
 */
export class ListItem extends React.Component {

  /**
   * Fragments.
   */
  static Fragments = Fragments;

  static propTypes = {
//  item: Fragments.item.propType,
    onSelect: React.PropTypes.func.isRequired,
    onLabelUpdate: React.PropTypes.func.isRequired
  };

  handleSelect() {
    this.props.onSelect(this.props.item);
  }

  handleToggleLabel(label) {
    let { item } = this.props;
    this.props.onLabelUpdate(item, label, _.indexOf(item.labels, label) == -1);
  }

  render() {
    let { item, icon } = this.props;

    // TODO(burdon): Const for labels.

    return (
      <div className="ux-row ux-list-item">
        <i className="ux-icon" onClick={ this.handleToggleLabel.bind(this, '_favorite') }>
          { _.indexOf(item.labels, '_favorite') == -1 ? 'star_border' : 'star' }
        </i>

        <div className="ux-text ux-expand" onClick={ this.handleSelect.bind(this) }>
          { item.title }
        </div>

        <i className="ux-icon ux-icon-type">{ icon }</i>
        <i className="ux-icon ux-icon-delete" onClick={ this.handleToggleLabel.bind(this, '_deleted') }>cancel</i>
      </div>
    );
  }
}
