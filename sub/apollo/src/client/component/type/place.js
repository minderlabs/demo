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
const PlaceFragment = gql`
  fragment PlaceFragment on Place {
    geo {
      lat
      lng
    }
  }
`;

/**
 * Type-specific query.
 */
const PlaceQuery = gql`
  query PlaceQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...PlaceFragment
    }
  }

  ${ItemFragment}
  ${PlaceFragment}  
`;

/**
 * Type-specific card container.
 */
class PlaceCardComponent extends React.Component {

  static propTypes = {
    item: propType(PlaceFragment)
  };

  render() {
    let { item, mutator, refetch, typeRegistry } = this.props;

    return (
      <CardContainer mutator={ mutator } refetch={ refetch } typeRegistry={ typeRegistry} item={ item }>
        <PlaceLayout ref="item" item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
export class PlaceLayout extends React.Component {

  static propTypes = {
    item: propType(PlaceFragment)
  };

  // TODO(burdon): Google map.

  render() {
    return (
      <div className="app-type-place ux-column ux-section ux-debug">
        <pre>
          { JSON.stringify(_.pick(this.props.item, ['geo']), 0, 2) }
        </pre>
      </div>
    );
  }
}

/**
 * HOC.
 */
export const PlaceCard = composeItem(
  new ItemReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: PlaceQuery,
      path: 'item'
    }
  })
)(PlaceCardComponent);
