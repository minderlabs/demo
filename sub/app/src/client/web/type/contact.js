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
  console.assert(bucketId);
  console.assert(project);
  console.assert(owner);
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
   * @param owner User object, if not null new tasks are assigned to this User, otherwise to the Viewer.
   * @param assignee User object, if not null new tasks are assigned to this User.
   * @param item Item to update.
   * @param mutations
   */
  handleItemUpdate(project, owner, assignee, item, mutations) {
    let { viewer: { user }, mutator } = this.context;
    owner = owner || user;

    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:parent } = this.props;

      let createParams = {
        batch: mutator.batch(),
        bucketId: user.id,
        project,
        parent,
        owner,
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
  taskSection(project, items, owner, assignee) {
    console.assert(assignee);
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
                  onItemUpdate={ this.handleItemUpdate.bind(this, project, owner, assignee) }/>
          </div>

          <div className="ux-card-footer">
            <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this, ref) }/>
          </div>
        </div>
      </div>
    );
  }

  // TODO(madadam): To util.
  getProjectFromGroupsByLabel(groups, label) {
    let projects = _.flatten(_.map(groups, group => _.get(group, 'projects', [])));
    return _.find(projects, project => { return _.indexOf(project.labels, label) !== -1 });
  }

  render() {
    let { viewer } = this.context;
    let { item:contact } = this.props;
    let { email, tasks, user } = contact;

    let project = user && this.getProjectFromGroupsByLabel(user.groups, '_default');

    let isContactSelf = (user && viewer.user.id === user.id);

    // Sort all tasks for this project into groups based on assignee.
    // TODO(madadam): Refactor ItemUtil.groupBy?
    let tasksForMeSection = null;
    let tasksForThemSection = null;
    if (project) {
      let tasksForMe = _.filter(_.get(project, 'tasks', []), item => {
        let assignee = _.get(item, 'assignee.id');
        let owner = _.get(item, 'owner.id');

        if (isContactSelf) {
          // Special case of self-view, owner can be anyone (show all my tasks).
          return assignee == viewer.user.id;
        } else {
          return assignee == viewer.user.id && owner == user.id;
        }
      });

      let tasksForThem = _.filter(_.get(project, 'tasks', []), item => {
        let assignee = _.get(item, 'assignee.id');
        let owner = _.get(item, 'owner.id');
        return assignee == user.id && owner == viewer.user.id;
      });

      tasksForMeSection = this.taskSection(project, tasksForMe, user, viewer.user);
      if (!isContactSelf) {
        // When a user sees her own Contact card, don't show this section.
        tasksForThemSection = this.taskSection(project, tasksForThem, viewer.user, user);
      }
    }

    let defaultProject = this.getProjectFromGroupsByLabel(this.context.viewer.groups, '_default');

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
                  onItemUpdate={ this.handleItemUpdate.bind(this, defaultProject, null, null) }/>
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
