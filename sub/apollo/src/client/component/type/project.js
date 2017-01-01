//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router';
import gql from 'graphql-tag';

import { ID, ItemReducer, TypeUtil } from 'minder-core';
import { List } from 'minder-ux';

import { UpdateItemMutation } from '../../data/mutations';
import { Path } from '../../path';
import { composeItem, CardContainer, ItemFragment } from '../item';
import { ItemList, UserTasksList, getWrappedList } from '../list_factory';

/**
 * Type-specific query.
 */
const ProjectQuery = gql`
  query ProjectQuery($itemId: ID!, $localItemId: ID!) {

    item(itemId: $itemId) {
      ...ItemFragment

      ... on Project {
        team {
          title
          members {
            id
            title

            tasks(filter: {
              type: "Task",
              expr: { 
                op: AND,
                expr: [
                  { field: "project", value: { id: $localItemId } }
                  { field: "assignee", ref: "id" },
                ]
              }
            }) {
              ...ItemFragment
              
              project {
                id
              }
            }
          }
        }
      }
    }
  }

  ${ItemFragment}
`;

/**
 * Type-specific reducer.
 */
const ProjectReducer = (matcher, context, previousResult, updatedItem) => {

  // Filter appropriate mutations.
  let assignee = _.get(updatedItem, 'assignee.id');
  if (assignee) {

    // Find the associated member.
    let members = _.get(previousResult, 'item.team.members');
    let memberIdx = _.findIndex(members, member => member.id === assignee);
    if (memberIdx != -1) {
      let member = members[memberIdx];
      let filter = { expr: { field: "assignee", value: { id: member.id } } };

      return {
        item: {
          team: {
            members: {
              [memberIdx]: {
                tasks: {
                  $apply: ItemReducer.listApplicator(matcher, context, filter, updatedItem)
                }
              }
            }
          }
        }
      };
    }
  }
};

/**
 * Type-specific card container.
 */
class ProjectCardComponent extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: React.PropTypes.object,
  };

  render() {
    let { user, item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item }>
        <ProjectLayout ref="item" user={ user } item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
class ProjectLayout extends React.Component {

  // TODO(burdon): Factor out.
  static createTaskMutation(user, project, title) {
    return [
      {
        field: 'owner',
        value: {
          id: user.id
        }
      },
      {
        field: 'title',
        value: {
          string: title
        }
      },
      {
        field: 'project',
        value: {
          id: project.id
        }
      }
    ];
  }

  static createProjectMutation(taskId) {
    return [
      {
        field: 'tasks',
        value: {
          array: {
            value: {
              id: taskId
            }
          }
        }
      }
    ];
  }

  // TODO(burdon): Factor out.
  static createDeleteMutation() {
    return [
      {
        field: 'labels',
        value: {
          array: {
            index: 0,
            value: {
              string: '_deleted'
            }
          }
        }
      }
    ];
  }

  // TODO(burdon): Move to card.
  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  // TODO(burdon): Also item select (e.g., nav to team member).
  handleTaskSelect(item) {
    this.context.navigator.pushDetail(item);
  }

  handleTaskAdd(list) {
    list.addItem();
  }

  /**
   * Submits the task mutation, then updates the project's tasks field.
   */
  updateTask(mutations) {
    let { item } = this.props;

    // TODO(burdon): Upsert.
    // TODO(burdon): Implement bi-directional links.
    let taskId = this.context.mutator.createItem('Task', mutations);
    this.context.mutator.updateItem(item, ProjectLayout.createProjectMutation(taskId));
  }

  handleMemberTaskSave(assignee, task) {
    console.assert(assignee && task);
    let { user, item:project } = this.props;

    this.updateTask(TypeUtil.merge(ProjectLayout.createTaskMutation(user, project, task.title),
      [
        {
          field: 'assignee',
          value: {
            id: assignee.id
          }
        }
      ]
    ));
  }

  // TODO(burdon): HACK: Implement links (bucket is a quick-fix).
  static sharedTasksFilter = (project) => ({
    type: 'Task',
    expr: {
      op: 'AND',
      expr: [
        {
          field: 'project',
          value: {
            id: project.id
          }
        },
        {
          field: 'assignee',
          value: {
            null: true
          }
        }
      ]
    }
  });

  handleSharedTaskSave(task) {
    console.assert(task);
    let { user, item:project } = this.props;

    this.updateTask(TypeUtil.merge(ProjectLayout.createTaskMutation(user, project, task.title),
      [
        {
          field: 'project',
          value: {
            id: project.id
          }
        }
      ]
    ));
  }

  // TODO(burdon): Implement ACLs.
  static privateTasksFilter = (user) => ({
    bucket: user.id,
    type: 'Task'
  });

  handlePrivateTaskSave(task) {
    console.assert(task);
    let { user, item:project } = this.props;

    this.updateTask(TypeUtil.merge(ProjectLayout.createTaskMutation(user, project, task.title),
      [
        {
          field: 'bucket',
          value: {
            id: user.id
          }
        }
      ]
    ));
  }

  handleTaskDelete(item) {
    // TODO(burdon): Remove from project tasks.
    this.context.mutator.updateItem(item, ProjectLayout.createDeleteMutation());
  }

  render() {
    let { user, item:project } = this.props;

    // TODO(burdon): Standardize or move to factory.
    const taskItemRenderer = (list, item) => {
      return (
        <div className="ux-row ux-data-row">
          <Link to={ Path.detail(ID.toGlobalId('Task', item.id)) }>
            <i className="ux-icon">assignment_turned_in</i>
          </Link>
          <div className="ux-text ux-expand">{ item.title }</div>
          <i className="ux-icon ux-icon-delete"
             onClick={ this.handleTaskDelete.bind(this, item) }>cancel</i>
        </div>
      );
    };

    const handleTaskAdd = (listId) => this.handleTaskAdd(getWrappedList(this.refs[listId]));
    const sectionHeader = (title, listId) => (
      <div className="ux-section-header ux-row">
        <h3 className="ux-expand">{ title }</h3>
        <i className="ux-icon ux-icon-add"
           onClick={ handleTaskAdd.bind(this, listId) }></i>
      </div>
    );

    return (
      <div className="app-type-project ux-column">

        {/*
          * Team tasks.
          */}
        <div>
          {project.team.members.map(member => (
          <div key={ member.id }>
            {/*
              * Member header.
              */}
            <div className="ux-section-header ux-row">
              <Link to={ Path.detail(ID.toGlobalId('User', member.id)) }>
                <i className="ux-icon">accessibility</i>
              </Link>
              <h3 className="ux-expand">{ member.title }</h3>
              <i className="ux-icon ux-icon-add"
                 onClick={ this.handleTaskAdd.bind(this, this.refs['list-' + member.id]) }></i>
            </div>

            {/*
              * Member tasks.
              */}
            <List ref={ 'list-' + member.id }
                  items={ member.tasks }
                  itemRenderer={ taskItemRenderer }
                  onItemSelect={ this.handleTaskSelect.bind(this) }
                  onItemSave={ this.handleMemberTaskSave.bind(this, member) }/>
          </div>
          ))}
        </div>

        {/*
          * Shared notes.
          */}
        <div>
          { sectionHeader('Shared Notes', 'list-shared') }

          <ItemList ref="list-shared"
                    filter={ ProjectLayout.sharedTasksFilter(project) }
                    itemRenderer={ taskItemRenderer }
                    onItemSelect={ this.handleTaskSelect.bind(this) }
                    onItemSave={ this.handleSharedTaskSave.bind(this) }/>
        </div>

        {/*
          * Private tasks.
          */}
        <div>
          { sectionHeader('Private Notes', 'list-private') }

          <UserTasksList ref="list-private"
                         filter={ ProjectLayout.privateTasksFilter(user) }
                         itemRenderer={ taskItemRenderer }
                         onItemSelect={ this.handleTaskSelect.bind(this) }
                         onItemSave={ this.handlePrivateTaskSave.bind(this) }/>
        </div>
      </div>
    );
  }
}

/**
 * HOC.
 */
export const ProjectCard = composeItem(
  new ItemReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: ProjectQuery,
      path: 'item'
    }
  },
  ProjectReducer)
)(ProjectCardComponent);
