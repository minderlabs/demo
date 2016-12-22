//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { DocumentListItem } from './type/document';
import { TypeRegistry } from './type/registry';

/**
 * List Item.
 */
export class ListItem extends React.Component {

  static propTypes = {
    // TODO(burdon): Constrain by fragment (graphql-anywhere): propType(VoteButtons.fragments.entry)
    // http://dev.apollodata.com/react/fragments.html
    item:           React.PropTypes.object.isRequired,

    onSelect:       React.PropTypes.func.isRequired,
    onLabelUpdate:  React.PropTypes.func.isRequired
  };

  static contextTypes = {
    injector: React.PropTypes.object.isRequired
  };

  handleSelect() {
    this.props.onSelect(this.props.item);
  }

  handleToggleLabel(label) {
    let { item } = this.props;
    this.props.onLabelUpdate(item, label, _.indexOf(item.labels, label) == -1);
  }

  render() {
    let { item, favorite, icon } = this.props;

    // TODO(burdon): Const for labels.
    // TODO(burdon): Custom renderer for different list type.
    let marginIcon = favorite && (
      <i className="ux-icon" onClick={ this.handleToggleLabel.bind(this, '_favorite') }>
        { _.indexOf(item.labels, '_favorite') == -1 ? 'star_border' : 'star' }
      </i>
    );

    const typeRegistry = this.context.injector.get(TypeRegistry);
    let customListItem = typeRegistry.renderToListItem(item.type, item, this.handleSelect.bind(this));

    if (customListItem) {
      return customListItem;
    } else {
      // Render generic ListItem.
      return (
        <div className="ux-row ux-list-item">
          { marginIcon }

          <div className="ux-text ux-expand" onClick={ this.handleSelect.bind(this) }>
            { item.title }
          </div>

          <i className="ux-icon ux-icon-type">{ icon }</i>
          <i className="ux-icon ux-icon-delete"
             onClick={ this.handleToggleLabel.bind(this, '_deleted') }>cancel</i>
        </div>
      );
    }
  }
}
