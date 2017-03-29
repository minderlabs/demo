//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import React from 'react';
import { compose } from 'react-apollo';
import gql from 'graphql-tag';

import { ItemReducer, Fragments, MutationUtil } from 'minder-core';
import { List, ReactUtil } from 'minder-ux';

import { connectReducer } from '../framework/connector';
import { Canvas } from '../component/canvas';
import { Card } from '../component/card';

import { TaskCard, TaskListItemRenderer } from './task';

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Create a sequence (batch) of mutations that create and update a new Task.
 * @param params
 * @return {Batch}
 * @constructor
 */
const AddCreateContactTask = (params) => {
  let { batch, bucketId, project, owner, assignee, parent, mutations } = params;
  let fieldMutations = _.compact([
    MutationUtil.createFieldMutation('bucket', 'string', bucketId),
    MutationUtil.createFieldMutation('project', 'id', project.id),
    MutationUtil.createFieldMutation('owner', 'id', owner.id),
    assignee && MutationUtil.createFieldMutation('assignee', 'id', assignee.id)
  ]);
  return batch
    .createItem('Task', _.concat(mutations, fieldMutations), 'new_task')
    .updateItem(parent, [
      MutationUtil.createFieldMutation('bucket', 'string', bucketId),
      MutationUtil.createSetMutation('tasks', 'id', '${new_task}')
    ])
    .updateItem(project, [
      MutationUtil.createSetMutation('tasks', 'id', '${new_task}')
    ]);
};

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

  handleTaskAdd(ref) {
    this.refs[ref].addItem();
  }

  /**
   *
   * @param project Project that owns this item.
   * @param assignee User object, if not null new tasks are assigned to this User.
   * @param item Item to update.
   * @param mutations
   */
  handleItemUpdate(project, assignee, item, mutations) {
    let { viewer: { user }, mutator } = this.context;

    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:parent } = this.props;

      console.assert(project);

      let createParams = {
        batch: mutator.batch(),
        bucketId: user.id,
        project,
        parent,
        owner: user,
        assignee,
        mutations
      };
      AddCreateContactTask(createParams).commit();
    }
  }

  // TODO(madadam): debugging cruft, delete.
  projectDebugString(project) {
    if (project) {
      return `${project.tasks.length} tasks in project ${project.title}`;
    }
  }

  /**
   *
   * @param items Items
   * @param project Project that owns new tasks.
   * @param assignee User object, assigned new tasks.
   * @return {XML}
   */
  taskSection(project, items, assignee) {
    let header = `Tasks for ${assignee.title}`;
    let ref = `tasks_${assignee.id}`;
    return (
      <div key={ assignee.id }>
        { !_.isEmpty(items) &&
        <div className="ux-section-header">
          <h3>{ header }</h3>
        </div>
        }
        <div className="ux-list-tasks">
          <div className="ux-scroll-container">
            <List ref={ ref }
                  data={ assignee.id }
                  items={ items }
                  itemRenderer={ TaskListItemRenderer }
                  onItemUpdate={ this.handleItemUpdate.bind(this, project, assignee) }/>
          </div>

          <div className="ux-card-footer">
            <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this, ref) }/>
          </div>
        </div>
      </div>
    );
  }

  render() {
    let { viewer } = this.context;
    let { item:contact } = this.props;
    let { email, tasks, user } = contact;

    // TODO(madadam): Get project by label '_default'.
    let project = user && _.get(user, 'groups[0].projects[0]');

    // Sort all tasks for this project into groups based on assignee.
    // TODO(madadam): Refactor ItemUtil.groupBy?
    let tasksForMeSection = null;
    let tasksForThemSection = null;
    if (project) {
      let tasksForMe = _.filter(_.get(project, 'tasks', []), item => {
        let assignee = _.get(item, 'assignee.id');
        let owner = _.get(item, 'owner.id');
        return assignee == viewer.user.id && owner == user.id;
      });

      let tasksForThem = _.filter(_.get(project, 'tasks', []), item => {
        let assignee = _.get(item, 'assignee.id');
        let owner = _.get(item, 'owner.id');
        return assignee == user.id && owner == viewer.user.id;
      });

      tasksForMeSection = this.taskSection(project, tasksForMe, viewer.user);
      if (viewer.user.id !== user.id) {
        // When a user sees her own Contact card, don't show this section. (Also avoids duplicate ref ids).
        tasksForThemSection = this.taskSection(project, tasksForThem, user);
      }
    }

    // TODO(burdon): Add to default project.
    let defaultProject = _.get(this.context.viewer, 'group.projects[0]');

    return (
      <Card ref="card" item={ contact }>
        <div className="ux-card-section">
          <div className="ux-data-row">
            <i className="ux-icon">email</i>
            <div className="ux-text">{ email }</div>
          </div>
          { user &&
          <div className="ux-data-row">
            <div className="ux-text">[{ this.projectDebugString(project) }]</div>
          </div>
          }
        </div>

        { tasksForMeSection }
        { tasksForThemSection }

        { !_.isEmpty(tasks) &&
        <div className="ux-section-header">
          <h3>Tasks</h3>
        </div>
        }
        <div className="ux-list-tasks">
          <div className="ux-scroll-container">
            <List ref="tasks"
                  items={ tasks }
                  itemRenderer={ TaskListItemRenderer }
                  onItemUpdate={ this.handleItemUpdate.bind(this, defaultProject, null) }/>
          </div>

          <div className="ux-card-footer">
            <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this, 'tasks') }/>
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
                  itemRenderer={ TaskListItemRenderer }
                  itemEditor={ TaskCard.TaskEditor }
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
      ...ContactTasksFragment
    }
  }

  ${Fragments.ItemFragment}
  ${Fragments.ContactTasksFragment}
`;

export const ContactCanvas = compose(
  connectReducer(ItemReducer.graphql(ContactQuery))
)(ContactCanvasComponent);
