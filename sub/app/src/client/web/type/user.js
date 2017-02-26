//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ItemFragment, UserFragment, ItemReducer, UpdateItemsMutation } from 'minder-core';
import { List, ReactUtil } from 'minder-ux';

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
    item: propType(UserFragment)
  };

  handleItemSelect(item) {
    this.context.navigator.pushCanvas(item);
  }

  // TODO(burdon): Factor out create/update (to task).
  handleItemUpdate(item, mutations) {
    console.warn('Not implemented');
  }

  handleItemAdd() {
    this.refs.tasks.addItem();
  }

  render() {
    return ReactUtil.render(this, () => {
      let { item, mutator, refetch } = this.props;
      let { ownerTasks, assigneeTasks } = item;

      // TODO(burdon): List type styling.

      return (
        <Canvas ref="canvas" item={ item } mutator={ mutator } refetch={ refetch }>
          <div className="app-type-user ux-column">

            <div className="ux-section-header ux-row">
              <h3 className="ux-expand">Owner</h3>
              <i className="ux-icon" onClick={ this.handleItemAdd.bind(this) }>add</i>
            </div>
            <List ref="tasks"
                  items={ ownerTasks }
                  itemRenderer={ TaskListItemRenderer }
                  onItemSelect={ this.handleItemSelect.bind(this) }
                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>

            <div className="ux-section-header ux-row">
              <h3 className="ux-expand">Assigned</h3>
            </div>
            <List items={ assigneeTasks }
                  itemRenderer={ TaskListItemRenderer }
                  onItemSelect={ this.handleItemSelect.bind(this) }
                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>
          </div>
        </Canvas>
      );
    });
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
      type: UpdateItemsMutation,
      path: 'upsertItems'
    }
  })
)(UserCanvasComponent);
