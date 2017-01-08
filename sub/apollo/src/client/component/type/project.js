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

//
// Project card.
//

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

  static contextTypes = {
    navigator: React.PropTypes.object
  };

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: React.PropTypes.object,
  };

  handleToggleCanvas() {
    let { item } = this.props;

    this.context.navigator.push(Path.canvas(ID.toGlobalId('Project', item.id), 'board'));
  }

  render() {
    let { user, item, mutator, typeRegistry } = this.props;

    return (
      <CardContainer mutator={ mutator } typeRegistry={ typeRegistry} item={ item }
                     onToggleCanvas={ this.handleToggleCanvas.bind(this) }>
        <ProjectCardLayout ref="item" user={ user } item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
class ProjectCardLayout extends React.Component {

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
    this.context.mutator.updateItem(item, ProjectCardLayout.createProjectMutation(taskId));
  }

  handleMemberTaskSave(assignee, task) {
    console.assert(assignee && task);
    let { user, item:project } = this.props;

    this.updateTask(TypeUtil.merge(ProjectCardLayout.createTaskMutation(user, project, task.title),
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

    this.updateTask(TypeUtil.merge(ProjectCardLayout.createTaskMutation(user, project, task.title),
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

    this.updateTask(TypeUtil.merge(ProjectCardLayout.createTaskMutation(user, project, task.title),
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
    if (!project || !project.team) {
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
                    filter={ ProjectCardLayout.sharedTasksFilter(project) }
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
                         filter={ ProjectCardLayout.privateTasksFilter(user) }
                         itemRenderer={ this._taskItemRenderer }
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


//
// Project board.
//

/**
 * Type-specific query.
 */
const ProjectBoardQuery = gql`
  query ProjectBoardQuery($itemId: ID!) {

    item(itemId: $itemId) {
      ...ItemFragment

      ... on Project {
        tasks {
          id
          title
          status
        }
      }
    }
  }

  ${ItemFragment}
`;

/**
 * Type-specific card container.
 */
class ProjectBoardComponent extends React.Component {

  // TODO(burdon): Generalize Board component (not just for projects).

  static contextTypes = {
    navigator: React.PropTypes.object
  };

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: React.PropTypes.object,
  };

  handleToggleCanvas() {
    let { item } = this.props;

    this.context.navigator.push(Path.canvas(ID.toGlobalId('Project', item.id)));
  }

  handleItemSelect(item) {
    this.context.navigator.push(Path.canvas(ID.toGlobalId('Task', item.id)));
  }

  render() {
    let { user, item={}, typeRegistry } = this.props;

    // TODO(burdon): Function to map items to board.
    const columns = [
      { id: 'c1', status: 0, title: 'Icebox'    },
      { id: 'c2', status: 1, title: 'Assigned'  },
      { id: 'c3', status: 2, title: 'Active'    },
      { id: 'c4', status: 3, title: 'Complete'  }
    ];

    let items = _.get(item, 'tasks', []);

    let columnMapper = (columns, item) => {
      let idx = _.findIndex(columns, column => {
        return (column.status == item.status);
      });

      return columns[idx];
    };

    // TODO(burdon): Base class for canvases (e.g., editable title like Card).
    // TODO(burdon): Title in Breadcrumbs.
    return (
      <div className="ux-column">
        <div className="app-canvas-header ux-section ux-row">
          <i className="ux-icon" onClick={ this.handleToggleCanvas.bind(this) }>{ typeRegistry.icon(item) }</i>

          <div className="ux-text">{ item.title }</div>
        </div>

        <Board item={ item } columns={ columns } items={ items } columnMapper={ columnMapper }
               onSelect={ this.handleItemSelect.bind(this) }/>
      </div>
    );
  }
}

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
      type: ProjectBoardQuery,
      path: 'item'
    }
  },
  ProjectReducer)
)(ProjectBoardComponent);
