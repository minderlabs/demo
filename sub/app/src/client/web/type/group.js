//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { compose } from 'react-apollo';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { GroupFragment, ItemFragment, ItemReducer } from 'minder-core';
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
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    item: propType(GroupFragment)
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

    // TODO(burdon): Add project to group (link?)
    // Augment editor mutations.
    if (project) {
      console.warn('Updating group: ' + JSON.stringify(group));
    } else {
      // TODO(burdon): Add bucket.
      mutations.push(
        {
          field: 'group',
          value: {
            id: group.id
          }
        }
      );

      mutator.createItem('Project', mutations);
    }
  }

  render() {
    return ReactUtil.render(this, () => {
      let { item:group, refetch } = this.props;

      return (
        <Canvas ref="canvas" item={ group } refetch={ refetch }>
          <div className="app-type-group ux-column">

            <div className="ux-column">
              <div className="ux-section-header ux-row">
                <h3 className="ux-expand">Members</h3>
              </div>
              <List items={ group.members } onItemSelect={ this.handleItemSelect.bind(this) }/>
            </div>

            <div className="ux-column">
              <div className="ux-section-header ux-row">
                <h3 className="ux-expand">Projects</h3>
                <i className="ux-icon ux-icon-add" onClick={ this.handleProjectAdd.bind(this) }></i>
              </div>
              <List ref="projects"
                    items={ group.projects }
                    onItemSelect={ this.handleItemSelect.bind(this) }
                    onItemUpdate={ this.handleProjectSave.bind(this) }/>
            </div>

          </div>
        </Canvas>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

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

export const GroupCanvas = compose(
  connectReducer(ItemReducer.graphql(GroupQuery))
)(GroupCanvasComponent);
