//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import gql from 'graphql-tag';

import { ID, ItemReducer, MutationUtil, TypeUtil } from 'minder-core';
import { ItemFragment, ProjectBoardFragment, TaskFragment, UpdateItemMutation } from 'minder-core';
import { Board, DragOrderModel, List } from 'minder-ux';

import { Path } from '../path';
import { composeItem } from '../framework/item_factory';
import { Canvas } from '../component/canvas';
import { Card } from '../component/card';

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Card.
 */
export class ProjectCard extends React.Component {

  render() {
    let { item } = this.props;

    return (
      <Card ref="card" item={ item }>
      </Card>
    );
  }
}

// TODO(burdon): Register different canvas types (different files: project_card, project_board, project_tasks).

/**
 * Tasks canvas.
 * http://localhost:3000/app/project/tasks/UHJvamVjdC9kZW1v
 */
class ProjectTasksCanvasComponent extends React.Component {

  render() {
    let { item:project={}, refetch, mutator } = this.props;

    return (
      <Canvas ref="canvas" item={ project } mutator={ mutator } refetch={ refetch }>
      </Canvas>
    );
  }
}

/**
 * Board canvas.
 * http://localhost:3000/app/project/UHJvamVjdC9kZW1v
 */
class ProjectBoardCanvasComponent extends React.Component {

  /**
   * Columns by status.
   */
  static statusBoardAdapter = {
    columnMapper: (columns, item) => {

    },
    onCreate: (column) => {

    },
    onDrop: (column) => {

    }
  };

  /**
   * Columns by assignee.
   */
  static assignedBoardAdapter = {
    // TODO(burdon): Is first column part of board (Icebox, Complete, Private tabs).
    columnMapper: (columns, item) => {

    },
    onCreate: (column) => {

    },
    onDrop: (column) => {

    }
  };

  static contextTypes = {
    typeRegistry: React.PropTypes.object.isRequired,
    navigator: React.PropTypes.object.isRequired
  };

  static childContextTypes = {
    mutator: React.PropTypes.object
  };

  static propTypes = {
    mutator: React.PropTypes.object.isRequired,
    user: React.PropTypes.object.isRequired,
    item: React.PropTypes.object,
    board: React.PropTypes.string
  };

  state = {
    itemOrderModel: new DragOrderModel(),
    boardAlias: null
  };

  getChildContext() {
    let { mutator } = this.props;
    return {
      mutator
    };
  }

  componentWillReceiveProps(nextProps) {
    let { item:project } = nextProps;

    this.setState({
      // TODO(burdon): Move to redux state (remove componentWillReceiveProps).
      boardAlias: _.get(project, 'boards[0].alias')
    });
  }

  handleItemSelect(item) {
    this.context.navigator.push(Path.canvas(ID.getGlobalId(item)));
  }

  handleItemUpdate(item, mutations, column) {
    let { mutator } = this.props;
    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:project } = this.props;

      let taskId = mutator.createItem('Task', TypeUtil.merge(mutations, [
        MutationUtil.createFieldMutation('project', 'id', project.id),
        MutationUtil.createFieldMutation('status', 'int', column.value)
      ]));

      mutator.updateItem(project, [
        MutationUtil.createSetMutation('tasks', 'id', taskId)
      ]);
    }
  }

  handleItemDrop(column, item, changes) {
    let { mutator, item:project } = this.props;
    let { boardAlias } = this.state;

    // Update status.
    // TODO(burdon): Customize for different boards (e.g., assigned).
    // TODO(burdon): What happens when drag items for user (change priority?)
    if (item.status !== column.value) {
      mutator.updateItem(item, [
        MutationUtil.createFieldMutation('status', 'int', column.value)
      ]);
    }

    // Update item order.
    mutator.updateItem(project, _.map(changes, change => ({
      field: 'boards',
      value: {
        map: [{

          // Upsert the given keyed value (in the array).
          predicate: {
            key: 'alias',
            value: {
              string: boardAlias
            }
          },

          value: {
            object: [{
              field: 'itemMeta',
              value: {
                map: [{

                  // Upsert item.
                  predicate: {
                    key: 'itemId',
                    value: {
                      string: change.itemId
                    }
                  },
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
    })));
  }

  handleSave() {
    return [];
  }

  handleSetView(view) {
    // TODO(burdon): Dispatch store state.
    console.log('View:', view);
    this.setState({
      view: view
    })
  }

  render() {
    let { typeRegistry } = this.context;
    let { item:project={}, refetch, mutator } = this.props;
    let { boardAlias, itemOrderModel } = this.state;

    // All items for board.
    let items = _.get(project, 'tasks', []);

    // Get the appropriate board.
    let board = _.find(_.get(project, 'boards'), board => board.alias == boardAlias);
    itemOrderModel.setLayout(_.get(board, 'itemMeta', []));

    // Columns (from board metadata).
    // TODO(burdon): How to make dynamic based on users?
    const columns = _.map(_.get(board, 'columns'), column => ({
      id: column.id,
      value: column.value.int,
      title: column.title
    }));

    // Map items to columns.
    const columnMapper = (columns, item) => {
      let idx = _.findIndex(columns, column => column.value == item.status);
      return columns[idx].id;
    };

    // Memu items.
    const Menu = (props) => {
      return (
        <div className="ux-bar">
          <i className="ux-icon ux-icon-action" onClick={ this.handleSetView.bind(this, 'priority') }>poll</i>
          <i className="ux-icon ux-icon-action" onClick={ this.handleSetView.bind(this, 'user') }>people</i>
        </div>
      );
    };

    return (
      <Canvas ref="canvas" item={ project } mutator={ mutator } refetch={ refetch }
              onSave={ this.handleSave.bind(this) } menu={ <Menu/> }>

        <Board item={ project } items={ items } columns={ columns } columnMapper={ columnMapper }
               itemRenderer={ Card.ItemRenderer(typeRegistry) }
               itemOrderModel={ itemOrderModel }
               onItemDrop={ this.handleItemDrop.bind(this) }
               onItemSelect={ this.handleItemSelect.bind(this) }
               onItemUpdate={ this.handleItemUpdate.bind(this) }/>
      </Canvas>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// HOC: ProjectTasksCanvas
//-------------------------------------------------------------------------------------------------

// TODO(burdon): Different sub-components (e.g., TeamList, TasksList). No query required?
// TODO(burdon): Team/Tasks master/list + list/detail.
// TODO(burdon): All, private, shared items (under team page).

const ProjectTasksQuery = gql`
  query ProjectTasksQuery($itemId: ID!) {
    item(itemId: $itemId) {
      ...ItemFragment
    }    
  }

  ${ItemFragment}
`;

/*
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

const ProjectReducer = (matcher, context, previousResult, updatedItem) => {

  // TODO(burdon): Get parent task for sub-tasks.
  // TODO(burdon): Check type.

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
*/

// TODO(burdon): Different query, reducer, etc.
export const ProjectTasksCanvas = composeItem(
  new ItemReducer({
    query: {
      type: ProjectTasksQuery,
      path: 'item'
    },
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    }
  })
)(ProjectTasksCanvasComponent);

//-------------------------------------------------------------------------------------------------
// HOC: ProjectBoardCanvas
//-------------------------------------------------------------------------------------------------

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

const ProjectBoardReducer = (matcher, context, previousResult, updatedItem) => {
  let { item:project } = previousResult;

  // Updated task.
  if (project.id == _.get(updatedItem, 'project.id')) {
    // TODO(burdon): Factor out pattern (see task also).
    let taskIdx = _.findIndex(project.tasks, task => task.id == updatedItem.id);
    if (taskIdx != -1) {
      // Update task.
      return {
        item: {
          tasks: {
            [taskIdx]: {
              $set: updatedItem
            }
          }
        }
      }
    } else {
      // Append task.
      return {
        item: {
          tasks: {
            $push: [ updatedItem ]
          }
        }
      }
    }
  }
};

export const ProjectBoardCanvas = composeItem(
  new ItemReducer({
    query: {
      type: ProjectBoardQuery,
      path: 'item'
    },
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    reducer: ProjectBoardReducer
  })
)(ProjectBoardCanvasComponent);
