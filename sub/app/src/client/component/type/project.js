//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router';
import gql from 'graphql-tag';

import { ID, ItemReducer, MutationUtil, TypeUtil } from 'minder-core';
import { ItemFragment, ProjectBoardFragment, TaskFragment } from 'minder-core';
import { Board, DragOrderModel, List, ListItem } from 'minder-ux';

import { UpdateItemMutation } from '../../data/mutations';
import { Path } from '../../path';
import { composeItem } from '../item';
import { CardContainer } from '../card';
import { CanvasContainer } from '../canvas';
import { ItemList, UserTasksList, getWrappedList } from '../list_factory';

//
// Project card.
//

/**
 * Type-specific query.
 */
const ProjectQuery = gql`
  query ProjectQuery($itemId: ID!, $localItemId: ID!) {
    
    # TODO(burdon): Remove $localItemId?

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
              ...TaskFragment
              
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
  ${TaskFragment}
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

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: React.PropTypes.object
  };

  handleToggleCanvas() {
    let { item } = this.props;

    this.context.navigator.push(Path.canvas(ID.toGlobalId('Project', item.id), 'board'));
  }

  render() {
    let { user, item, mutator, refetch, typeRegistry } = this.props;

    return (
      <CardContainer mutator={ mutator } refetch={ refetch } typeRegistry={ typeRegistry} item={ item }
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
          set: [{
            value: {
              id: taskId
            }
          }]
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
    let { item:project } = this.props;

    // TODO(burdon): Upsert.
    // TODO(burdon): Implement bi-directional links.
    let taskId = this.context.mutator.createItem('Task', mutations);
    this.context.mutator.updateItem(project, ProjectCardLayout.createProjectMutation(taskId));
  }

  handleMemberTaskSave(assignee, task) {
    console.assert(assignee && task);
    let { user, item:project } = this.props;

    this.updateTask(TypeUtil.merge(
      ProjectCardLayout.createTaskMutation(user, project, task.title), [
        MutationUtil.createFieldMutation('assignee', 'id', assignee.id)
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
          field: 'bucket',
          value: {
            null: true
          }
        },
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

    this.updateTask(TypeUtil.merge(
      ProjectCardLayout.createTaskMutation(user, project, task.title), [
        MutationUtil.createFieldMutation('project', 'id', project.id)
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

    // TODO(burdon): Use MutationUtil.
    this.updateTask(TypeUtil.merge(
      ProjectCardLayout.createTaskMutation(user, project, task.title), [
        MutationUtil.createFieldMutation('bucket', 'id', user.id)
      ]
    ));
  }

  handleTaskDelete(item) {
    // TODO(burdon): Remove from project tasks.
    this.context.mutator.updateItem(item, [ MutationUtil.createDeleteMutation() ]);
  }

  render() {
    let { user, item:project } = this.props;
    if (!project || !project.team) {
      return <div/>;
    }

    const handleTaskAdd = (listId) => this.handleTaskAdd(getWrappedList(this.refs[listId]));
    const sectionHeader = (title, listId) => (
      <div className="ux-section-header ux-section-header-dark ux-row">
        <h4 className="ux-expand">{ title }</h4>
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
          <div className="ux-section-header ux-section-header-dark ux-row">
            <h3>Team Tasks</h3>
          </div>
          {project.team.members.map(member => (
          <div key={ member.id }>
            {/*
              * Member header.
              */}
            <div className="ux-section-header ux-row">
              <Link to={ Path.canvas(ID.toGlobalId('User', member.id)) }>
                <i className="ux-icon">accessibility</i>
              </Link>
              <h4 className="ux-expand">{ member.title }</h4>
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
        ...ProjectBoardFragment

        tasks {
          ...TaskFragment

          tasks {
            ...TaskFragment
          }
        }
      }
    }
  }

  ${ItemFragment}
  ${ProjectBoardFragment}
  ${TaskFragment}  
`;

/**
 * Type-specific card container.
 */
class ProjectBoardComponent extends React.Component {

  // TODO(burdon): Generalize Board component (not just for projects).

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: React.PropTypes.object,
    board: React.PropTypes.string
  };

  constructor() {
    super(...arguments);

    this.state = {
      board: null,
      itemOrderModel: new DragOrderModel()
    };
  }

  componentWillReceiveProps(nextProps) {
    let { item:project } = nextProps;

    this.setState({
      // Default board.
      board: _.get(project, 'boards[0].alias')
    })
  }

  handleToggleCanvas() {
    let { item:project } = this.props;
    this.context.navigator.push(Path.canvas(ID.toGlobalId('Project', project.id)));
  }

  handleItemSelect(item) {
    this.context.navigator.push(Path.canvas(ID.toGlobalId('Task', item.id)));
  }

  handleItemDrop(column, item, changes) {
    let { item:project } = this.props;
    let { board } = this.state;
    console.assert(board);

    // TODO(burdon): Wrap board with CanvasLayout (and pass mutator via context).
    // TODO(burdon): Do optimistic update before re-rendering.

    // TODO(burdon): Customize for different boards (e.g., assigned).
    let status = column.value;
    this.props.mutator.updateItem(item, [ MutationUtil.createFieldMutation('status', 'int', status) ]);

    // TODO(burdon): Update specific board (separate node or Project meta?)
    let mutations = _.map(changes, change => ({
      field: 'boards',
      value: {
        map: [{

          // Upsert the given keyed value (in the array).
          predicate: {
            key: 'alias',
            value: {
              string: board
            }
          },

          value: {
            object: [{
              field: 'itemMeta',
              value: {
                // TODO(burdon): Should this be a map transformation (could boards above just use an object transform)?
                object: [{
                  field: change.itemId,
                  value: {
                    object: [
                      {
                        field: 'listId',
                        value: {
                          string: change.listId
                        }
                      },
                      {
                        field: 'order',
                        value: {
                          float: change.order
                        }
                      }
                    ]
                  }
                }]
              }
            }]
          }
        }]
      }
    }));

    // TODO(burdon): Allow for multiple mutations (on different items).
    this.props.mutator.updateItem(project, mutations);
  }

  render() {
    let { item:project={}, typeRegistry } = this.props;
    let { itemOrderModel } = this.state;

    // Get the appropriate board.
    // TODO(burdon): Get from props.
    let boardAlias = "tasks";
    let board = _.find(_.get(project, 'boards'), board => board.alias == boardAlias);
    itemOrderModel.setLayout(_.get(board, 'itemMeta', []));

    let items = _.get(project, 'tasks', []);

    // TODO(burdon): Config value.
    const columns = _.map(_.get(board, 'columns'), column => ({
      id: column.id,
      value: column.value.int,
      title: column.title
    }));

    // Map items to columns.
    const columnMapper = (columns, item) => {
      let idx = _.findIndex(columns, column => {
        return (column.value == item.status);
      });

      return columns[idx].id;
    };

    // TODO(burdon): Factor out.
    const CompactItemRenderer = (item) => {
      let card = typeRegistry.compact(item);
      if (!card) {
        card = <ListItem.Title/>;
      }

      return (
        <ListItem item={ item }>
          { card }
        </ListItem>
      );
    };

    // TODO(burdon): Move title to NavBar.
    // TODO(burdon): Base class for canvases (e.g., editable title like Card).
    return (
      <div className="ux-column">
        <div className="ux-section ux-row">
          <i className="ux-icon" onClick={ this.handleToggleCanvas.bind(this) }>{ typeRegistry.icon(project) }</i>

          <div className="ux-text">{ project.title }</div>
        </div>

        <Board item={ project } items={ items } columns={ columns } columnMapper={ columnMapper }
               itemRenderer={ CompactItemRenderer }
               itemOrderModel={ itemOrderModel }
               onItemDrop={ this.handleItemDrop.bind(this) }
               onItemSelect={ this.handleItemSelect.bind(this) }/>
      </div>
    );
  }
}

/**
 * Wrapper.
 */
class ProjectBoardCanvas extends React.Component {

  render() {
    let { user, item, refetch, typeRegistry } = this.props;

    return (
      <CanvasContainer refetch={ refetch }>
        <ProjectBoardComponent typeRegistry={ typeRegistry } user={ user } item={ item }/>
      </CanvasContainer>
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
)(ProjectBoardCanvas);
