//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ItemReducer, ItemFragment, UpdateItemsMutation, MutationUtil } from 'minder-core';
import { ReactUtil, TextBox } from 'minder-ux';

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
    return ReactUtil.render(this, () => {
      let { item, refetch } = this.props;

      return (
        <Canvas item={ item } refetch={ refetch }/>
      );
    });
  }
}

/**
 * Canvas Header.
 */
export class ItemCanvasHeaderComponent extends React.Component {

  static propTypes = {
    toolbar: React.PropTypes.object
  };

  handleUpdate(title) {
    let { mutator, item } = this.props;

    if (title != item.title) {
      mutator.updateItem(item, [
        MutationUtil.createFieldMutation('title', 'string', title)
      ]);
    }
  }

  render() {
    return ReactUtil.render(this, () => {
      let { item, toolbar } = this.props;
      let { title } = item;

      // TODO(burdon): Cancel button.

      return (
        <div className="ux-row ux-expand">

          <div className="ux-navbar-buttons">
            { toolbar }
          </div>

          <div className="ux-title ux-expand">
            <TextBox value={ title }
                     className="ux-expand"
                     placeholder="Title"
                     notEmpty={ true }
                     clickToEdit={ true }
                     onEnter={ this.handleUpdate.bind(this) }/>
          </div>

        </div>
      );
    }, false);
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
      type: UpdateItemsMutation,
      path: 'upsertItems'
    }
  })
)(ItemCanvasComponent);

export const ItemCanvasHeader = composeItem(
  new ItemReducer({
    query: {
      type: ItemQuery,
      path: 'item'
    },
    mutation: {
      type: UpdateItemsMutation,
      path: 'upsertItems'
    }
  })
)(ItemCanvasHeaderComponent);
