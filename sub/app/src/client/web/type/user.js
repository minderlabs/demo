//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { compose } from 'react-apollo';
import gql from 'graphql-tag';

import { Fragments, ItemReducer } from 'minder-core';
import { List, ReactUtil } from 'minder-ux';

import { connectReducer } from '../framework/connector';
import { Canvas } from '../component/canvas';
import { TaskCard, TaskListItemRenderer } from './task';

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Canvas.
 */
class UserCanvasComponent extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    item: React.PropTypes.object
  };

  handleItemSelect(item) {
    this.context.navigator.pushCanvas(item);
  }

  handleItemUpdate(item, mutations) {
    console.warn('Not implemented.');
  }

  handleSave() {
    return [];
  }

  render() {
    return ReactUtil.render(this, () => {
      let { item:user, refetch } = this.props;
      let { ownerTasks, assigneeTasks } = user;

      return (
        <Canvas ref="canvas"
                item={ user }
                refetch={ refetch }
                onSave={ this.handleSave.bind(this)}>

          <div className="ux-section">
            <div className="ux-section-header ux-row">
              <h3 className="ux-expand ux-title">Owner</h3>
            </div>
            <List ref="tasks"
                  className="ux-list-tasks"
                  items={ ownerTasks }
                  itemRenderer={ TaskListItemRenderer }
                  itemEditor={ TaskCard.TaskEditor }
                  onItemSelect={ this.handleItemSelect.bind(this) }
                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>
          </div>

          <div className="ux-section">
            <div className="ux-section-header ux-row">
              <h3 className="ux-expand ux-title">Assigned</h3>
            </div>
            <List items={ assigneeTasks }
                  className="ux-list-tasks"
                  itemRenderer={ TaskListItemRenderer }
                  itemEditor={ TaskCard.TaskEditor }
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

  ${Fragments.ItemFragment}
  ${Fragments.UserFragment}  
`;

export const UserCanvas = compose(
  connectReducer(ItemReducer.graphql(UserQuery))
)(UserCanvasComponent);
