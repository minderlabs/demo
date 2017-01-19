//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ItemReducer } from 'minder-core';

import { UpdateItemMutation } from '../../data/mutations';
import { composeItem, ItemFragment } from '../item';
import { CardContainer } from '../card';

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
class DocumentCardComponent extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: propType(DocumentFragment)
  };

  handleSave() {}

  render() {
    let { item, mutator, refetch, typeRegistry } = this.props;

    return (
      <CardContainer mutator={ mutator } refetch={ refetch } typeRegistry={ typeRegistry} item={ item }
                     onSave={ this.handleSave.bind(this) }>
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
 * Custom list column.
 */
export const DocumentColumn = (props, context) => {
  return (
    <div className="ux-font-xsmall ux-link">
      <a target="MINDER_OPEN" href={ props.item.url }>
        { props.item.source }
      </a>
    </div>
  );
};

/**
 * HOC.
 */
export const DocumentCard = composeItem(
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
)(DocumentCardComponent);
