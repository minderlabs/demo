//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ItemReducer, ItemFragment, UpdateItemMutation } from 'minder-core';

import { composeItem } from '../framework/item_factory';
import { Canvas } from '../component/canvas';
import { Card } from '../component/card';

//
// Components.
//

/**
 * Card
 */
export class ItemCard extends React.Component {

  static propTypes = {
    item: propType(ItemFragment).isRequired
  };

  render() {
    let { item } = this.props;

    let className = 'ux-type-' + item.type.toLowerCase();

    return (
      <Card className={ className } item={ item }/>
    );
  }
}

/**
 * Canvas.
 */
export class ItemCanvasComponent extends React.Component {

  static propTypes = {
    refetch: React.PropTypes.func.isRequired,
    item: propType(ItemFragment)
  };

  render() {
    if (this.props.loading) { return <div/>; }
    let { item, refetch } = this.props;

    return (
      <Canvas item={ item } refetch={ refetch }/>
    );
  }
}

//
// HOC.
//

/**
 * Type-specific query.
 */
const ItemQuery = gql`
  query ItemQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
    }
  }

  ${ItemFragment}  
`;

export const ItemCanvas = composeItem(
  new ItemReducer({
    query: {
      type: ItemQuery,
      path: 'item'
    },
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    }
  })
)(ItemCanvasComponent);
