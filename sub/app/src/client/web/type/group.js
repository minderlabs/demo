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

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Canvas.
 * NOTE: This is them Team Canvas for a group.
 */
class GroupCanvasComponent extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    mutator: React.PropTypes.object.isRequired,
    user: React.PropTypes.object.isRequired,
    item: propType(GroupFragment)
  };

  handleItemSelect(item) {
    this.context.navigator.pushCanvas(item);
  }

  handleProjectAdd() {
    this.refs.projects.addItem();
  }

  handleProjectSave(item, mutations) {
    let { mutator } = this.props;

    // Augment editor mutations.
    mutations.push(
      {
        field: 'team',
        value: {
          id: item.id
        }
      }
    );

    mutator.createItem('Project', mutations);
  }

  render() {
    let { item, mutator, refetch } = this.props;

    return (
      <Canvas ref="canvas" item={ item } mutator={ mutator } refetch={ refetch }>
        <div className="app-type-group ux-column">

          <div className="ux-column">
            <div className="ux-section-header ux-row">
              <h3 className="ux-expand">Members</h3>
            </div>
            <List items={ item.members }
                  onItemSelect={ this.handleItemSelect.bind(this) }/>
          </div>

          <div className="ux-column">
            <div className="ux-section-header ux-row">
              <h3 className="ux-expand">Projects</h3>
              <i className="ux-icon ux-icon-add" onClick={ this.handleProjectAdd.bind(this) }></i>
            </div>
            <List ref="projects"
                  items={ item.projects }
                  onItemSelect={ this.handleItemSelect.bind(this) }
                  onItemUpdate={ this.handleProjectSave.bind(this) }/>
          </div>

        </div>
      </Canvas>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const GroupFragment = gql`
  fragment GroupFragment on Group {
    id 
    members {
      id
      type
      title
    }
    
    # TODO(burdon): Shouldn't be part of Group. Instead link.
    projects {
      id
      title
    }
  }
`;

const GroupQuery = gql`
  query GroupQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...GroupFragment
    }
  }

  ${ItemFragment}
  ${GroupFragment}  
`;

export const GroupCanvas = composeItem(
  new ItemReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: GroupQuery,
      path: 'item'
    }
  })
)(GroupCanvasComponent);
