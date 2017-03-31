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

import { TaskItemEditor, TaskItemRenderer } from './task';

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------


/**
 * Card.
 */
export class ContactCard extends React.Component {

  // TODO(burdon): This is a very specialized ContactCard. Factor out sections.

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
   * Create/update task.
   *
   * @param {Item} item Item to update.
   * @param {[Mutation]} mutations
   * @param {Project} project Project that owns this item.
   * @param {User|null} owner User object, if not null new tasks are assigned to this User, otherwise to the Viewer.
   * @param {User} assignee User object, if not null new tasks are assigned to this User.
   * @param {boolean} linkToParent
   */
  handleTaskUpdate(item=null, mutations, project, owner=null, assignee=null, linkToParent=false) {
    console.assert(project && owner && assignee);
    let { viewer: { user }, mutator } = this.context;

    owner = owner || user;

    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:parent } = this.props;

      mutator.batch()

        // New task.
        .createItem('Task', _.concat(mutations, [
          MutationUtil.createFieldMutation('bucket', 'string', user.id),
          MutationUtil.createFieldMutation('project', 'id', project.id),
          MutationUtil.createFieldMutation('owner', 'id', owner.id),
          assignee && MutationUtil.createFieldMutation('assignee', 'id', assignee.id)
        ]), 'new_task')

        // Parent project.
        .updateItem(project, [
          MutationUtil.createSetMutation('tasks', 'id', '${new_task}')
        ])

        // Parent Contact.
        // TODO(burdon): Why is the bucket changed? (should be immutable).
        .updateItem(parent, [
          MutationUtil.createFieldMutation('bucket', 'string', user.id),
          linkToParent && MutationUtil.createSetMutation('tasks', 'id', '${new_task}')
        ])

        .commit();
    }
  }

  /**
   *
   * @param {[Item]} items Items
   * @param {Project} project Project that owns new tasks.
   * @param {User} owner
   * @param {User} assignee
   * @return {XML}
   */
  taskSection(project, items, owner, assignee) {
    console.assert(project && items && owner && assignee);

    let ref = `tasks_${assignee.id}`;
    let header = `Tasks for ${assignee.title}`;

    const handleTaskUpdate = (item, mutations) => {
      this.handleTaskUpdate(item, mutations, project, owner, assignee);
    };

    return (
      <div key={ assignee.id }>
        <div className="ux-section-header">
          <h3 className="ux-expand">{ header }</h3>
          <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this, ref) }/>
        </div>

        <div className="ux-list-tasks">
          <div className="ux-scroll-container">
            <List ref={ ref }
                  data={ assignee.id }
                  items={ items }
                  itemEditor={ TaskItemEditor }
                  itemRenderer={ TaskItemRenderer }
                  onItemUpdate={ handleTaskUpdate }/>
          </div>
        </div>
      </div>
    );
  }

  render() {
    let { config, viewer } = this.context;
    let { item:contact } = this.props;
    let { email, tasks, user } = contact;

    let defaultProject = ContactCard.getProjectFromGroupsByLabel(viewer.groups, '_default');
    let userProject = user && ContactCard.getProjectFromGroupsByLabel(user.groups, '_default');

    let isContactSelf = (user && viewer.user.id === user.id);

    // Sort all tasks for this project into groups based on assignee.
    // TODO(madadam): Refactor ItemUtil.groupBy?
    let assignedToViewerSection = null;
    let assignedToContactSection = null;
    if (userProject) {
      let assignedToViewer = _.filter(_.get(userProject, 'tasks'), item => {
        let assignee = _.get(item, 'assignee.id');
        let owner = _.get(item, 'owner.id');

        if (isContactSelf) {
          // Special case of self-view, owner can be anyone (show all my tasks).
          return assignee === viewer.user.id;
        } else {
          return assignee === viewer.user.id && owner === user.id;
        }
      });

      let assignedToContact = _.filter(_.get(userProject, 'tasks'), item => {
        let assignee = _.get(item, 'assignee.id');
        let owner = _.get(item, 'owner.id');
        return assignee === user.id && owner === viewer.user.id;
      });

      assignedToViewerSection = this.taskSection(userProject, assignedToViewer, user, viewer.user);

      // When a user sees her own Contact card, don't show this section.
      if (!isContactSelf) {
        assignedToContactSection = this.taskSection(userProject, assignedToContact, viewer.user, user);
      }
    }

    const handleTaskUpdate = (item, mutations) => {
      this.handleTaskUpdate(item, mutations, defaultProject, null, null, true)
    };

    return (
      <Card ref="card" item={ contact }>
        <div className="ux-card-section">
          <div className="ux-data-row">
            <i className="ux-icon">email</i>
            <div className="ux-text">{ email }</div>
          </div>

          { config.debug && user &&
          <div className="ux-data-row">
            <div className="ux-text">[{ ContactCard.projectDebugString(userProject) }]</div>
          </div>
          }
        </div>

        { assignedToViewerSection }
        { assignedToContactSection }

        <div className="ux-section-header">
          <h3 className="ux-expand">Tasks</h3>
          <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this, 'tasks') }/>
        </div>
        <div className="ux-list-tasks">
          <div className="ux-scroll-container">
            <List ref="tasks"
                  items={ tasks }
                  itemEditor={ TaskItemEditor }
                  itemRenderer={ TaskItemRenderer }
                  onItemUpdate={ handleTaskUpdate }/>
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

  handleTaskUpdate(item=null, mutations) {
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
      ...ContactTasksFragment
    }
  }

  ${Fragments.ItemFragment}
  ${Fragments.ContactTasksFragment}
`;

export const ContactCanvas = compose(
  connectReducer(ItemReducer.graphql(ContactQuery))
)(ContactCanvasComponent);
