//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ItemFragment, UserFragment, ItemReducer, UpdateItemMutation } from 'minder-core';
import { List } from 'minder-ux';

import { composeItem } from '../framework/item_factory';
import { Canvas } from '../component/canvas';
import { TaskListItemRenderer } from './task';

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Canvas.
 */
class UserCanvasComponent extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    mutator: React.PropTypes.object.isRequired,
    user: React.PropTypes.object.isRequired,
    item: propType(UserFragment)
  };

  handleItemSelect(item) {
    console.log(':::', item);
    this.context.navigator.pushCanvas(item);
  }

  // TODO(burdon): Factor out create/update (to task).
  handleItemUpdate(item, mutations) {
    console.log(':::', item, mutations);
  }

  handleItemAdd() {
    this.refs.tasks.addItem();
  }

  render() {
    let { item={}, mutator, refetch } = this.props;

    // TODO(burdon): List type styling.

    return (
      <Canvas ref="canvas" item={ item } mutator={ mutator } refetch={ refetch }>
        <div className="app-type-user ux-column">

          <div className="ux-section-header ux-row">
            <h3 className="ux-expand">Owner</h3>
            <i className="ux-icon" onClick={ this.handleItemAdd.bind(this) }>add</i>
          </div>
          <List ref="tasks"
                items={ item.ownerTasks }
                itemRenderer={ TaskListItemRenderer }
                onItemSelect={ this.handleItemSelect.bind(this) }
                onItemUpdate={ this.handleItemUpdate.bind(this) }/>

          <div className="ux-section-header ux-row">
            <h3 className="ux-expand">Assigned</h3>
          </div>
          <List items={ item.assigneeTasks }
                itemRenderer={ TaskListItemRenderer }
                onItemSelect={ this.handleItemSelect.bind(this) }
                onItemUpdate={ this.handleItemUpdate.bind(this) }/>
        </div>
      </Canvas>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const UserQuery = gql`
  query UserQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...UserFragment
    }
  }

  ${ItemFragment}
  ${UserFragment}  
`;

export const UserCanvas = composeItem(
  new ItemReducer({
    query: {
      type: UserQuery,
      path: 'item'
    },
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    }
  })
)(UserCanvasComponent);
