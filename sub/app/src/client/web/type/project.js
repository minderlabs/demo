//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import gql from 'graphql-tag';

import { ID, ItemReducer, MutationUtil, TypeUtil } from 'minder-core';
import { ItemFragment, ProjectBoardFragment, TaskFragment, UpdateItemMutation } from 'minder-core';
import { Board, DragOrderModel, List, ReactUtil } from 'minder-ux';

import { Path } from '../../common/path';

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

  handleTaskAdd() {
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
      throw new Error('Not implemented.');
    }
  }

  render() {
    let { item:project } = this.props;
    let { tasks } = project;

    return (
      <Card ref="card" item={ project }>

        <div className="ux-list-tasks">
          <div className="ux-scroll-container">
            <List ref="tasks"
                  items={ tasks }
                  itemRenderer={ TaskListItemRenderer }
                  onItemSelect={ this.handleItemSelect.bind(this) }
                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>
          </div>
          {/*
          <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this) }/>
          */}
        </div>
      </Card>
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
        const COLUMNS = [
          { "id": "c1", "value": { "int": 0 }, "title": "Unstarted" },
          { "id": "c2", "value": { "int": 1 }, "title": "Active"    },
          { "id": "c3", "value": { "int": 2 }, "title": "Complete"  },
          { "id": "c4", "value": { "int": 3 }, "title": "Blocked"   }
        ];

        return _.map(COLUMNS, column => ({
          id:     column.id,
          value:  column.value.int,
          title:  column.title
        }));
      },

      columnMapper: (userId) => (columns, item) => {
        let idx = _.findIndex(columns, column => column.value == _.get(item, 'status'));
        return (item.bucket) ? null : (idx != -1) && columns[idx].id;
      },

      onCreateMutations: (userId, column) => {
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
        let users = _.map(_.get(project, 'group.members'), user => ({
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

      columnMapper: (userId) => (columns, item) => {
        let idx = _.findIndex(columns, column => column.value == _.get(item, 'assignee.id'));
        return (item.bucket) ? null : (idx == -1) ? ProjectBoardCanvasComponent.COLUMN_ICEBOX : columns[idx].id;
      },

      onCreateMutations: (userId, column) => {
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

      columnMapper: (userId) => (columns, item) => {
        console.log(JSON.stringify(item));
        return (item.bucket == userId) ? 'private' : null;
      },

      onCreateMutations: (userId, column) => {
        return [
          MutationUtil.createFieldMutation('bucket', 'id', userId)
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
    registration: React.PropTypes.object.isRequired,
    item: React.PropTypes.object
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
    let { registration: { userId }, mutator } = this.props;
    console.assert(userId);

    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:project } = this.props;
      let { boardAdapter } = this.state;

      // Create task (with custom and board-specific mutations.
      let taskId = mutator.createItem('Task', _.concat(
        [
          // TODO(burdon): Move into mutator (default for item). Enforce on write.
          MutationUtil.createFieldMutation('owner', 'id', userId),

          MutationUtil.createFieldMutation('project', 'id', project.id)
        ],
        boardAdapter.onCreateMutations(userId, column) || [],
        mutations
      ));

      mutator.updateItem(project, [
        MutationUtil.createSetMutation('tasks', 'id', taskId)
      ]);
    }
  }

  handleItemDrop(column, item, changes) {
    let { item:project, mutator } = this.props;
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
    return ReactUtil.render(this, () => {
        let { registration: { userId }, item:project, refetch, mutator } = this.props;
      let { boardAdapter, boardAlias, itemOrderModel } = this.state;
      let { typeRegistry } = this.context;  // TODO(burdon): Get from compose_item props.

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
                 columnMapper={ boardAdapter.columnMapper(userId) }
                 itemRenderer={ Card.ItemRenderer(typeRegistry) }
                 itemOrderModel={ itemOrderModel }
                 onItemDrop={ this.handleItemDrop.bind(this) }
                 onItemSelect={ this.handleItemSelect.bind(this) }
                 onItemUpdate={ this.handleItemUpdate.bind(this) }/>
        </Canvas>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC: ProjectBoardCanvas
//-------------------------------------------------------------------------------------------------

const ProjectBoardQuery = gql`
  query ProjectBoardQuery($itemId: ID!) {

    item(itemId: $itemId) {
      ...ItemFragment

      ... on Project {
        ...ProjectBoardFragment

        group {
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
