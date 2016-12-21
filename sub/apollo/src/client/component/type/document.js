//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import gql from 'graphql-tag';
import { propType } from 'graphql-anywhere';

import { MutationUtil, TypeUtil } from 'minder-core';

import { composeItem, CardContainer, ItemFragment } from '../item';

import ItemsPicker from '../items_picker';

/**
 * Type-specific fragment.
 */
const DocumentFragment = gql`
    fragment DocumentFragment on Document {
        url
        iconUrl
        source
    }
`;

// FIXME Can't be an items() query, this item doesn't exist, hasn't been reified.
// 1. Repeat search
// 2. cache temporary item data locally
// 3. write the item on detail click (ugh no)
// Otherwise, what happens on detail click? That argues for it linking external, but that's confusing UX.
// maybe (3) does make sense - is it that different from clicking star? in that case, we'd promote it to real item,
// write to store, right?

/**
 * Type-specific query.
 */
const DocumentQuery = gql`
    query DocumentQuery($itemId: ID!) {

        item(itemId: $itemId) {
            ...ItemFragment
            ...DocumentFragment
        }
    }

    ${ItemFragment}
    ${DocumentFragment}
`;

/**
 * Type-specific card container.
 */
class DocumentCard extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: propType(DocumentFragment)
  };

  handleSave() {}

  render() {
    let { item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item } onSave={ this.handleSave.bind(this) }>
        <DocumentLayout ref="item" item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
class DocumentLayout extends React.Component {

  constructor() {
    super(...arguments);

    this._values = {};
  }

  get values() {
    return this._values;
  }

  render() {
    let { item } = this.props;

    // FIXME

    return (
      <div className="app-type-task ux-column ux-section">
        <div className="ux-data">
          <div className="ux-data-row">
            <div className="ux-data-label">Source</div>
            <div className="ux-text"><a href={ _.get(item, 'url') }>{ _.get(item, 'source') }</a></div>
          </div>
        </div>
      </div>
    );
  }
}

// FIXME TypeRegistry.renderListItem(item), default is ListItem, can be specialized as in here.

/**
 * List Item.
 */
export class DocumentListItem extends React.Component {

  static propTypes = {
    // TODO(burdon): Constrain by fragment (graphql-anywhere): propType(VoteButtons.fragments.entry)
    // http://dev.apollodata.com/react/fragments.html
    item:           React.PropTypes.object.isRequired,

    onSelect:       React.PropTypes.func.isRequired,
  };

  handleSelect() {
    this.props.onSelect(this.props.item);
  }

  render() {
    let { item, favorite, icon } = this.props;

    // FIXME UI. Favorite? second row for snippet and source? What links to external URL, what links to detail?

    let marginIcon = item.iconUrl && (
      <img class="ux-icon" src={ item.iconUrl} />
    );

    return (
      <div className="ux-row ux-list-item">
        { marginIcon }

        <div className="ux-text ux-expand" >
          <a href={ item.url }>
            { item.source }
          </a>
        </div>

        <i className="ux-icon ux-icon-type">{ icon }</i>
      </div>
    );
  }
}

/**
 * HOC.
 */
export default composeItem(DocumentQuery)(DocumentCard);
