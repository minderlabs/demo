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
class PlaceCard extends React.Component {

  static propTypes = {
    item: propType(PlaceFragment)
  };

  render() {
    let { item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item }>
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
export default composeItem(
  new ItemReducer(UpdateItemMutation, PlaceQuery)
)(PlaceCard);
