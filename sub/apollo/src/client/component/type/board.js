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
const BoardFragment = gql`
  fragment BoardFragment on Board {
    id
  }
`;

/**
 * Type-specific query.
 */
const BoardQuery = gql`
  query BoardQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...BoardFragment
    }
  }

  ${ItemFragment}
  ${BoardFragment}  
`;

/**
 * Type-specific card container.
 */
class BoardCardComponent extends React.Component {

  static propTypes = {
    item: propType(BoardFragment)
  };

  render() {
    let { item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item }>
        <BoardLayout ref="item" item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
class BoardLayout extends React.Component {

  static propTypes = {
    item: propType(BoardFragment)
  };

  // TODO(burdon): Google map.

  render() {
    return (
      <div className="app-type-board ux-column ux-section ux-debug">
        <h1>Board</h1>
      </div>
    );
  }
}

/**
 * HOC.
 */
export const BoardCard = composeItem(
  new ItemReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: BoardQuery,
      path: 'item'
    }
  })
)(BoardCardComponent);
