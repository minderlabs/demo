//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router';
import gql from 'graphql-tag';

import { ID, ItemReducer, MutationUtil, TypeUtil } from 'minder-core';
import { Board, List, ListItem } from 'minder-ux';

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
                  $apply: Reducer.listApplicator(matcher, context, filter, updatedItem)
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
    let { user, item, mutator } = this.props;

    let nav = null && item && (
      <div>
        <Link to={ Path.canvas(ID.toGlobalId('Project', item.id), 'board') }>
          <i className="ux-icon">view_column</i>
        </Link>
      </div>
    );

    return (
      <CardContainer mutator={ mutator } item={ item } nav={ nav }>
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

  // TODO(burdon): Move to card.
  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  constructor() {
    super(...arguments);

    this._taskItemRenderer = (item) => (
      <ListItem item={ item }>
        <ListItem.Title/>
        <ListItem.Delete onDelete={ this.handleTaskDelete.bind(this) }/>
      </ListItem>
    );
  }

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
    this.context.mutator.updateItem(item, MutationUtil.createDeleteMutation());
  }

  render() {
    let { user, item:project } = this.props;
    if (!project) {
      return <div/>;
    }

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
              <Link to={ Path.canvas(ID.toGlobalId('User', member.id)) }>
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
                  itemRenderer={ this._taskItemRenderer }
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
                    itemRenderer={ this._taskItemRenderer }
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
                         itemRenderer={ this._taskItemRenderer }
                         onItemSelect={ this.handleTaskSelect.bind(this) }
                         onItemSave={ this.handlePrivateTaskSave.bind(this) }/>
        </div>
      </div>
    );
  }
}

/**
 * Type-specific card container.
 */
class ProjectBoardComponent extends React.Component {

  // TODO(burdon): Generalize Board component (not just for projects).

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: React.PropTypes.object,
  };

  render() {
    let { user, item } = this.props;

    // TODO(burdon): Function to map items to board.
    const columns = [
      { id: 'c1', status: 0, title: 'Icebox'    },
      { id: 'c2', status: 1, title: 'Assigned'  },
      { id: 'c3', status: 2, title: 'Active'    },
      { id: 'c4', status: 3, title: 'Complete'  }
    ];

    // TODO(burdon): Use real data.
    // TODO(burdon): Add status to task.
    let items = [
      { id: 't1', status: 0, title: 'Task 1' },
      { id: 't2', status: 0, title: 'Task 2' },
      { id: 't3', status: 0, title: 'Task 3' },
      { id: 't4', status: 1, title: 'Task 4' },
      { id: 't5', status: 2, title: 'Task 5' }
    ];

    let columnMapper = (columns, item) => {
      let idx = _.findIndex(columns, column => {
        return (column.status == item.status);
      });

      return columns[idx];
    };

    return (
      <Board item={ item } columns={ columns } items={ items } columnMapper={ columnMapper }/>
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

/**
 * HOC.
 */
export const ProjectBoard = composeItem(
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
)(ProjectBoardComponent);
