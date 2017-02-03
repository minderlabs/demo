//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ItemFragment, ItemReducer, UpdateItemMutation } from 'minder-core';
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

  static propTypes = {
    mutator: React.PropTypes.object.isRequired,
    user: React.PropTypes.object.isRequired,
    item: propType(UserFragment)
  };

  // TODO(burdon): Factor out (shared across types?). Normalize names (Item/Task).
  handleItemSelect(item) {}
  handleItemUpdate(item, mutations) {}
  handleItemAdd() {
    this.refs.tasks.addItem();
  }

  render() {
    let { mutator, refetch, item } = this.props;

    // TODO(burdon): Use List controls.

    return (
      <Canvas ref="canvas" item={ item } mutator={ mutator } refetch={ refetch }>
        <div className="app-type-user ux-column">

          <div className="ux-section-header ux-row">
            <h3 className="ux-expand">Owned</h3>
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

// TODO(burdon): Move to fragments.js
const UserFragment = gql`
  fragment UserFragment on User {
    title

    ownerTasks: tasks(filter: { expr: { field: "owner", ref: "id" } }) {
      id
      title
    }

    assigneeTasks: tasks(filter: { expr: { field: "assignee", ref: "id" } }) {
      id
      title
    }
  }
`;

// TODO(burdon): Link to contact?
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
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: UserQuery,
      path: 'item'
    }
  })
)(UserCanvasComponent);
