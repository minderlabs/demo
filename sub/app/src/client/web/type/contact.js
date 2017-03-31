//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { compose } from 'react-apollo';
import gql from 'graphql-tag';

import { ItemReducer, Fragments, MutationUtil } from 'minder-core';
import { List, ReactUtil } from 'minder-ux';

import { connectReducer } from '../framework/connector';
import { Canvas } from '../component/canvas';
import { Card } from '../component/card';

import { TaskItemEditor, TaskItemRenderer } from './task';

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Card.
 */
export class ContactCard extends React.Component {

  static contextTypes = {
    mutator: React.PropTypes.object.isRequired,
    viewer: React.PropTypes.object.isRequired,
  };

  static propTypes = {
    item: React.PropTypes.object.isRequired
  };

  handleTaskAdd() {
    this.refs.tasks.addItem();
  }

  handleItemUpdate(item, mutations) {
    let { viewer: { user }, mutator } = this.context;

    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:parent } = this.props;

      // TODO(burdon): Add to default project.
      let project = _.get(this.context.viewer, 'groups[0].projects[0]');
      console.assert(project);

      mutator.batch()
        .createItem('Task', _.concat(mutations, [
          MutationUtil.createFieldMutation('bucket', 'string', user.id),
          MutationUtil.createFieldMutation('project', 'id', project.id),
          MutationUtil.createFieldMutation('owner', 'id', user.id)
        ]), 'new_task')
        .updateItem(parent, [
          MutationUtil.createFieldMutation('bucket', 'string', user.id),
          MutationUtil.createSetMutation('tasks', 'id', '${new_task}')
        ])
        .updateItem(project, [
          MutationUtil.createSetMutation('tasks', 'id', '${new_task}')
        ])
        .commit();
    }
  }

  render() {
    let { item:contact } = this.props;
    let { email, tasks, user } = contact;

    return (
      <Card ref="card" item={ contact }>
        <div className="ux-card-section">
          <div className="ux-data-row">
            <i className="ux-icon">email</i>
            <div className="ux-text">{ email }</div>
          </div>
          { user &&
          <div className="ux-data-row">
            <div className="ux-text">[User with { user.ownerTasks.length } tasks]</div>
          </div>
          }
        </div>

        { !_.isEmpty(tasks) &&
        <div className="ux-section-header">
          <h3>Tasks</h3>
        </div>
        }
        <div className="ux-list-tasks">
          <div className="ux-scroll-container">
            <List ref="tasks"
                  items={ tasks }
                  itemRenderer={ TaskItemRenderer }
                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>
          </div>

          <div className="ux-card-footer">
            <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this) }/>
          </div>
        </div>
      </Card>
    );
  }
}

/**
 * Canvas.
 */
export class ContactCanvasComponent extends React.Component {

  static contextTypes = {
    mutator: React.PropTypes.object.isRequired,
    viewer: React.PropTypes.object.isRequired
  };

  static propTypes = {
    refetch: React.PropTypes.func.isRequired,
    item: React.PropTypes.object
  };

  handleSave() {
    return [];
  }

  handleTaskUpdate(item, mutations) {
    console.assert(mutations);
    let { mutator } = this.context;

    if (item) {
      mutator.updateItem(item, mutations);
    }
  }

  render() {
    return ReactUtil.render(this, () => {
      let { item:contact, refetch } = this.props;
      let { email, tasks } = contact;

      return (
        <Canvas ref="canvas"
                item={ contact }
                refetch={ refetch }
                onSave={ this.handleSave.bind(this)}>

          <div className="ux-section">
            <div className="ux-section-body ux-font-small">
              <div>{ email }</div>
            </div>
          </div>

          <div className="ux-section">
            <div className="ux-section-header ux-row">
              <h4 className="ux-expand ux-title">Tasks</h4>
            </div>

            <List ref="tasks"
                  className="ux-list-tasks"
                  items={ tasks }
                  itemEditor={ TaskItemEditor }
                  itemRenderer={ TaskItemRenderer }
                  onItemUpdate={ this.handleTaskUpdate.bind(this) }/>
          </div>
        </Canvas>
      );
    });
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

  ${Fragments.ItemFragment}
  ${Fragments.ContactFragment}  
`;

export const ContactCanvas = compose(
  connectReducer(ItemReducer.graphql(ContactQuery))
)(ContactCanvasComponent);
