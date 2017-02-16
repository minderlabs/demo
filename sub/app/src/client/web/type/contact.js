//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ItemReducer, ItemFragment, ContactFragment, UpdateItemMutation } from 'minder-core';

import { composeItem } from '../framework/item_factory';
import { Canvas } from '../component/canvas';
import { Card } from '../component/card';

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Card.
 */
export class ContactCard extends React.Component {

  static propTypes = {
    item: propType(ContactFragment).isRequired
  };

  render() {
    let { item } = this.props;
    let { email } = item;

    return (
      <Card ref="card" item={ item }>
        <div>{ email }</div>
      </Card>
    );
  }
}

/**
 * Canvas.
 */
export class ContactCanvasComponent extends React.Component {

  static propTypes = {
    refetch: React.PropTypes.func.isRequired,
    item: propType(ContactFragment)
  };

  render() {
    if (this.props.loading) { return <div/>; }
    let { item, refetch } = this.props;
    let { email } = item;

    return (
      <Canvas ref="canvas" item={ item } refetch={ refetch }>
        <div>{ email }</div>
      </Canvas>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const ContactQuery = gql`
  query ContactQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...ContactFragment
    }
  }

  ${ItemFragment}
  ${ContactFragment}  
`;

export const ContactCanvas = composeItem(
  new ItemReducer({
    query: {
      type: ContactQuery,
      path: 'item'
    },
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    }
  })
)(ContactCanvasComponent);
