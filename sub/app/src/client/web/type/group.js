//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'react-apollo';
import gql from 'graphql-tag';

import { Fragments, ItemReducer, MutationUtil } from 'minder-core';
import { List, ReactUtil } from 'minder-ux';

import { connectReducer } from '../framework/connector';
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
    navigator: PropTypes.object.isRequired,
    mutator: PropTypes.object.isRequired
  };

  static propTypes = {
    item: PropTypes.object
  };

  handleItemSelect(item) {
    this.context.navigator.pushCanvas(item);
  }

  handleProjectAdd() {
    this.refs.projects.addItem();
  }

  handleProjectSave(project, mutations) {
    let { mutator } = this.context;
    let { item:group } = this.props;

    if (project) {
      console.warn('Not implemented.');
    } else {
      mutator
        .batch(group.id)
        .createItem('Project', _.concat(mutations, [
          MutationUtil.createFieldMutation('group', 'id', group.id)
        ]), 'new_project')
        .commit();
    }
  }

  handleSave() {
    return [];
  }

  render() {
    return ReactUtil.render(this, () => {
      let { item:group, refetch } = this.props;
      let { members, projects } = group;

      return (
        <Canvas ref="canvas"
                item={ group }
                refetch={ refetch }
                onSave={ this.handleSave.bind(this)}>

          <div className="ux-section">
            <div className="ux-section-header ux-row">
              <h4 className="ux-expand ux-title">Members</h4>
            </div>
            <List items={ members } onItemSelect={ this.handleItemSelect.bind(this) }/>
          </div>

          <div className="ux-section">
            <div className="ux-section-header ux-row">
              <h4 className="ux-expand ux-title">Projects</h4>
              <i className="ux-icon ux-icon-add" onClick={ this.handleProjectAdd.bind(this) }></i>
            </div>
            <List ref="projects"
                  items={ projects }
                  onItemSelect={ this.handleItemSelect.bind(this) }
                  onItemUpdate={ this.handleProjectSave.bind(this) }/>
          </div>

        </Canvas>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const GraphReducer = (matcher, context, previousResult, updatedItem) => {
  let { item:group } = previousResult;

  if (updatedItem.type === 'Project' && updatedItem.group === previousResult.id) {
    let projectIdx = _.findIndex(group.projects, project => project.id === updatedItem.group);
    if (projectIdx === -1) {
      return {
        item: {
          projects: {
            $push: [updatedItem]
          }
        }
      }
    }
  }
};

const GroupQuery = gql`  
  query GroupQuery($itemId: ID!) {
    item(itemId: $itemId) {
      ...ItemFragment
      ...GroupFragment
    }
  }

  ${Fragments.ItemFragment}
  ${Fragments.GroupFragment}  
`;

export const GroupCanvas = compose(
  connectReducer(ItemReducer.graphql(GroupQuery, GraphReducer))
)(GroupCanvasComponent);
