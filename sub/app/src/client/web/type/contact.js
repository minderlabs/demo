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
 * Mutation helper to create a sequence (batch) of mutations that create and update a new Task.
 */
class CreateContactTask {

  constructor(batch, mutations=[]) {
    console.assert(batch);
    this._batch = batch;

    // Copy the array.
    this._mutations = _.compact(mutations);

    this._parent = null;
    this._parentMutations = [];

    this._project = null;
    this._projectMutations = [];
  }

  bucket(bucketId) {
    console.assert(bucketId);
    this._mutations.push(MutationUtil.createFieldMutation('bucket', 'string', bucketId));
    return this;
  }

  owner(owner) {
    if (owner) {
      this._mutations.push(MutationUtil.createFieldMutation('owner', 'id', owner.id));
    }
    return this;
  }

  assignee(assignee) {
    if (assignee) {
      this._mutations.push(MutationUtil.createFieldMutation('assignee', 'id', assignee.id));
    }
    return this;
  }

  /**
   * Add the task to this project.
   * @param project
   * @return {CreateContactTask}
   */
  project(project) {
    console.assert(project);
    this._mutations.push(MutationUtil.createFieldMutation('project', 'id', project.id));
    this._project = project;
    this._projectMutations = _.concat(this._projectMutations, [
      MutationUtil.createSetMutation('tasks', 'id', '${new_task}')
    ]);
    return this;
  }

  /**
   * @param parent
   * @param bucketId set bucketID on this parent (possibly cloning external item).
   * @param linkToParent if true, link the task to this parent.
   */
  parent(parent, bucketId, linkToParent=true) {
    console.assert(parent);
    this._parent = parent;
    this._parentMutations = _.concat(this._parentMutations, [
      MutationUtil.createFieldMutation('bucket', 'string', bucketId),
      linkToParent && MutationUtil.createSetMutation('tasks', 'id', '${new_task}')
    ]);
    return this;
  }

  commit() {
    this._batch.createItem('Task', this._mutations, 'new_task');
    this._parent && this._batch.updateItem(this._parent, this._parentMutations);
    this._project && this._batch.updateItem(this._project,this._projectMutations);
    this._batch.commit();
  }

}

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

  // TODO(madadam): debugging cruft, delete.
  static projectDebugString(project) {
    if (project) {
      return `${project.tasks.length} tasks in project ${project.title}`;
    }
  }

  static getProjectFromGroupsByLabel(groups, label) {
    return _.chain(groups)
      .map(group => _.get(group, 'projects'))
      .flatten()
      .find(project => _.indexOf(project.labels, label) !== -1)
      .value();
  }

  handleTaskAdd(ref) {
    this.refs[ref].addItem();
  }

  /**
   *
   * @param project Project that owns this item.
   * @param parent Item, if not null new tasks are linked to this item.
   * @param owner User object, if not null new tasks are assigned to this User, otherwise to the Viewer.
   * @param assignee User object, if not null new tasks are assigned to this User.
   * @param item Item to update.
   * @param mutations
   */
  handleItemUpdate(project, owner, assignee, linkToParent, item, mutations) {
    let { viewer: { user }, mutator } = this.context;
    owner = owner || user;

    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:parent } = this.props;

      new CreateContactTask(mutator.batch(), mutations)
        .bucket(user.id)
        .owner(owner)
        .assignee(assignee)
        .project(project)
        .parent(parent, user.id, linkToParent)
        .commit();
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
                  onItemUpdate={ this.handleItemUpdate.bind(this, project, owner, assignee, false) }/>
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

    let project = user && ContactCard.getProjectFromGroupsByLabel(user.groups, '_default');

    let isContactSelf = (user && viewer.user.id === user.id);

    // Sort all tasks for this project into groups based on assignee.
    // TODO(madadam): Refactor ItemUtil.groupBy?
    let assignedToViewerSection = null;
    let assignedToContactSection = null;
    if (project) {
      let assignedToViewer = _.filter(_.get(project, 'tasks'), item => {
        let assignee = _.get(item, 'assignee.id');
        let owner = _.get(item, 'owner.id');

        if (isContactSelf) {
          // Special case of self-view, owner can be anyone (show all my tasks).
          return assignee === viewer.user.id;
        } else {
          return assignee === viewer.user.id && owner === user.id;
        }
      });

      let assignedToContact = _.filter(_.get(project, 'tasks'), item => {
        let assignee = _.get(item, 'assignee.id');
        let owner = _.get(item, 'owner.id');
        return assignee === user.id && owner === viewer.user.id;
      });

      assignedToViewerSection = this.taskSection(project, assignedToViewer, user, viewer.user);
      if (!isContactSelf) {
        // When a user sees her own Contact card, don't show this section.
        assignedToContactSection = this.taskSection(project, assignedToContact, viewer.user, user);
      }
    }

    let defaultProject = ContactCard.getProjectFromGroupsByLabel(this.context.viewer.groups, '_default');

    return (
      <Card ref="card" item={ contact }>
        <div className="ux-card-section">
          <div className="ux-data-row">
            <i className="ux-icon">email</i>
            <div className="ux-text">{ email }</div>
          </div>
          { user &&
          <div className="ux-data-row">
            <div className="ux-text">[{ ContactCard.projectDebugString(project) }]</div>
          </div>
          }
        </div>

        { assignedToViewerSection }
        { assignedToContactSection }

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
                  onItemUpdate={ this.handleItemUpdate.bind(this, defaultProject, null, null, true) }/>
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
