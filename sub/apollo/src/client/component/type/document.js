//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ItemReducer } from 'minder-core';

import { UpdateItemMutation } from '../../data/mutations';
import { composeItem, CardContainer, ItemFragment } from '../item';

/**
 * Type-specific fragment.
 */
export const DocumentFragment = gql`
  fragment DocumentFragment on Document {
    url
    iconUrl
    source
  }
`;

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

/**
 * List Item.
 */
export class DocumentListItem extends React.Component {

  // TODO(burdon): Remove with custom list renderer.

  static propTypes = {
    // TODO(burdon): Constrain by fragment (graphql-anywhere): propType(VoteButtons.fragments.entry)
    // http://dev.apollodata.com/react/fragments.html
    item:           React.PropTypes.object.isRequired,
  };

  render() {
    let { item } = this.props;

    // TODO(madadam): Snippet, thumbnail image, etc.

    let marginIcon = item.iconUrl && (
      <img className="ux-icon" src={ item.iconUrl} />
    );

    return (
      <div className="ux-row ux-list-item">
        { marginIcon }

        <div className="ux-text ux-expand" >
          <a href={ item.url }>
            { item.title }
          </a> [{item.source}]
        </div>

      </div>
    );
  }
}

/**
 * HOC.
 */
export default composeItem(
  new ItemReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: DocumentQuery,
      path: 'item'
    }
  })
)(DocumentCard);
