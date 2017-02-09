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

import { TaskListItemRenderer } from './task';

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Card.
 */
export class ProjectCard extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  handlTaskAdd() {
    this.refs.tasks.addItem();
  }

  handleItemSelect(item) {
    this.context.navigator.push(Path.canvas(ID.getGlobalId(item)));
  }

  handleItemUpdate(item, mutations) {
    let { mutator } = this.context;

    if (item) {
      // Update existing.
      mutator.updateItem(item, mutations);
    } else {
      // TODO(burdon): Add personal item (see task.js).
      console.warning('Not implemented.');
    }
  }

  render() {
    let { item } = this.props;
    let { tasks } = item;

    return (
      <Card ref="card" item={ item }>

        <div className="ux-list-tasks">
          <div className="ux-scroll-container">
            <List ref="tasks"
                  items={ tasks }
                  itemRenderer={ TaskListItemRenderer }
                  onItemSelect={ this.handleItemSelect.bind(this) }
                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>
          </div>
          {/*
          <i className="ux-icon ux-icon-add" onClick={ this.handlTaskAdd.bind(this) }/>
          */}
        </div>
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

  static COLUMN_ICEBOX = 'icebox';

  /**
   * The board alias determines the layout of the board (columns, etc.)
   */
  static boardAdapters = {

    /**
     * Columns by status.
     */
    status: {

      // Columns (from board metadata).
      columns: (project, board) => {
        return _.map(_.get(board, 'columns'), column => ({
          id:     column.id,
          value:  column.value.int,
          title:  column.title
        }));
      },

      columnMapper: (user) => (columns, item) => {
        let idx = _.findIndex(columns, column => column.value == _.get(item, 'status'));
        return (item.bucket) ? null : (idx != -1) && columns[idx].id;
      },

      onCreateMutations: (user, column) => {
        return [
          MutationUtil.createFieldMutation('status', 'int', column.value)
        ];
      },

      onDropMutations: (item, column) => {
        return (column.value != _.get(item, 'status')) && [
          MutationUtil.createFieldMutation('status', 'int', column.value)
        ];
      }
    },

    /**
     * Columns by assignee.
     */
    assignee: {

      columns: (project, board) => {
        let users = _.map(_.get(project, 'team.members'), user => ({
          id:     user.id,
          value:  user.id,
          title:  user.title,
        })).sort((a, b) => a.title > b.title);

        // TODO(burdon): Separate column (last) for private items.
        return _.concat({
          id: ProjectBoardCanvasComponent.COLUMN_ICEBOX,
          value: ProjectBoardCanvasComponent.COLUMN_ICEBOX,
          title: 'Icebox'
        }, users);
      },

      columnMapper: (user) => (columns, item) => {
        let idx = _.findIndex(columns, column => column.value == _.get(item, 'assignee.id'));
        return (item.bucket) ? null : (idx == -1) ? ProjectBoardCanvasComponent.COLUMN_ICEBOX : columns[idx].id;
      },

      onCreateMutations: (user, column) => {
        return (column.id != ProjectBoardCanvasComponent.COLUMN_ICEBOX) && [
          MutationUtil.createFieldMutation('assignee', 'id', column.value)
        ];
      },

      onDropMutations: (item, column) => {
        if (column.value != _.get(item, 'assignee.id')) {
          return (column.id == ProjectBoardCanvasComponent.COLUMN_ICEBOX) ? [
            MutationUtil.createFieldMutation('assignee') // Set null.
          ] : [
            MutationUtil.createFieldMutation('assignee', 'id', column.value)
          ];
        }
      }
    },

    /**
     * Private items.
     * TODO(burdon): Merge with other boards.
     */
    private: {

      // Columns (from board metadata).
      columns: (project, board) => {
        return [{
          id:     'private',
          value:  'private',
          title:  'Private'
        }];
      },

      columnMapper: (user) => (columns, item) => {
        console.log(JSON.stringify(item));
        return (item.bucket == user.id) ? 'private' : null;
      },

      onCreateMutations: (user, column) => {
        return [
          MutationUtil.createFieldMutation('bucket', 'id', user.id)
        ];
      },

      onDropMutations: (item, column) => {}
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
    boardAdapter: ProjectBoardCanvasComponent.boardAdapters['status'],
    boardAlias: 'status'
  };

  getChildContext() {
    let { mutator } = this.props;
    return {
      mutator
    };
  }

  handleSetBoardType(boardAlias) {
    this.setState({
      boardAdapter: ProjectBoardCanvasComponent.boardAdapters[boardAlias],
      boardAlias
    });
  }

  handleItemSelect(item) {
    this.context.navigator.push(Path.canvas(ID.getGlobalId(item)));
  }

  handleItemUpdate(item, mutations, column) {
    let { user, mutator } = this.props;
    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:project } = this.props;
      let { boardAdapter } = this.state;

      // Create task (with custom and board-specific mutations.
      let taskId = mutator.createItem('Task', _.concat(
        [
          MutationUtil.createFieldMutation('project', 'id', project.id)
        ],
        boardAdapter.onCreateMutations(user, column) || [],
        mutations
      ));

      mutator.updateItem(project, [
        MutationUtil.createSetMutation('tasks', 'id', taskId)
      ]);
    }
  }

  handleItemDrop(column, item, changes) {
    let { mutator, item:project } = this.props;
    let { boardAdapter, boardAlias } = this.state;

    // Update item for column.
    let dropMutations = boardAdapter.onDropMutations(item, column);
    if (dropMutations) {
      mutator.updateItem(item, dropMutations);
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

  render() {
    let { typeRegistry } = this.context;
    let { user, item:project={}, refetch, mutator } = this.props;
    let { boardAdapter, boardAlias, itemOrderModel } = this.state;

    // All items for board.
    let items = _.get(project, 'tasks', []);

    // Get the appropriate board.
    let board = _.find(_.get(project, 'boards'), board => board.alias == boardAlias);
    itemOrderModel.setLayout(_.get(board, 'itemMeta', []));

    // Memu items.
    // TODO(burdon): List board types.
    const Menu = (props) => {
      return (
        <div className="ux-bar">
          <i className="ux-icon ux-icon-action" title="Status Board"
             onClick={ this.handleSetBoardType.bind(this, 'status') }>assessment</i>
          <i className="ux-icon ux-icon-action" title="Team Board"
             onClick={ this.handleSetBoardType.bind(this, 'assignee') }>people</i>
          <i className="ux-icon ux-icon-action" title="Private Board"
             onClick={ this.handleSetBoardType.bind(this, 'private') }>person</i>
        </div>
      );
    };

    return (
      <Canvas ref="canvas" item={ project } mutator={ mutator } refetch={ refetch }
              onSave={ this.handleSave.bind(this) } menu={ <Menu/> }>

        <Board item={ project }
               items={ items }
               columns={ boardAdapter.columns(project, board) }
               columnMapper={ boardAdapter.columnMapper(user) }
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

        team {
          members {
            type
            id
            title
          }
        }

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
