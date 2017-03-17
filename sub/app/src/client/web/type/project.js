//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { compose } from 'react-apollo';
import { connect } from 'react-redux';
import gql from 'graphql-tag';

import { Fragments, DomUtil, ID, ItemReducer, MutationUtil } from 'minder-core';
import { Board, DragOrderModel, List, ReactUtil, connectWithRef } from 'minder-ux';

import { Path } from '../../common/path';
import { AppAction } from '../../common/reducers';

import { connectReducer } from '../framework/connector';
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
      mutator.updateItem(item, mutations);
    } else {
      // TODO(burdon): Add task to project.
      console.warn('Not implemented.');
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

  // TODO(burdon): Rename unassigned.
  static COLUMN_ICEBOX = 'icebox';

  /**
   * The board alias determines the layout of the board (columns, etc.)
   */
  static BoardAdapters = {

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

      columnMapper: (groupId, userId) => (columns, item) => {
        if (item.bucket === userId) {
          return -1;
        }

        let idx = _.findIndex(columns, column => column.value == _.get(item, 'status'));
        return (idx != -1) && columns[idx].id;
      },

      onCreateMutations: (groupId, userId, column) => {
        return [
          MutationUtil.createFieldMutation('bucket', 'string', groupId),
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
          title: 'Unassigned'
        }, users);
      },

      columnMapper: (groupId, userId) => (columns, item) => {
        if (item.bucket === userId) {
          return -1;
        }

        let idx = _.findIndex(columns, column => column.value == _.get(item, 'assignee.id'));
        return (idx == -1) ? ProjectBoardCanvasComponent.COLUMN_ICEBOX : columns[idx].id;
      },

      onCreateMutations: (groupId, userId, column) => {
        let mutations = [
          MutationUtil.createFieldMutation('bucket', 'string', groupId)
        ];

        // TODO(burdon): Optimistic concurrency fail (need to patch from cache).
        if (column.id != ProjectBoardCanvasComponent.COLUMN_ICEBOX) {
          mutations.push(MutationUtil.createFieldMutation('assignee', 'id', column.value));
        }

        return mutations;
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

      columnMapper: (groupId, userId) => (columns, item) => {
        return (item.bucket === userId) ? 'private' : -1;
      },

      onCreateMutations: (groupId, userId, column) => {
        return [
          MutationUtil.createFieldMutation('bucket', 'string', userId)
        ];
      },

      onDropMutations: (item, column) => {}
    }
  };

  static contextTypes = {
    typeRegistry: React.PropTypes.object.isRequired,
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired,
    registration: React.PropTypes.object.isRequired,
  };

  static propTypes = {
    item: React.PropTypes.object
  };

  state = {
    itemOrderModel: new DragOrderModel()
  };

  get boardAdapter() {
    let { boardAlias } = this.props;
    console.assert(boardAlias);
    return ProjectBoardCanvasComponent.BoardAdapters[boardAlias];
  }

  get canvas() {
    return this.refs.canvas;
  }

  handleItemSelect(item) {
    this.context.navigator.push(Path.canvas(ID.getGlobalId(item)));
  }

  handleItemUpdate(item, mutations, column) {
    let { mutator, registration: { groupId, userId } } = this.context;
    console.assert(userId);

    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:project } = this.props;

      mutator
        .batch()
        .createItem('Task', [
          this.boardAdapter.onCreateMutations(groupId, userId, column),
          MutationUtil.createFieldMutation('owner', 'id', userId),
          MutationUtil.createFieldMutation('project', 'id', project.id),
          mutations
        ], 'new_task')
        .updateItem(project, [
          MutationUtil.createSetMutation('tasks', 'id', '${new_task}')
        ])
        .commit();
    }
  }

  handleItemDrop(column, item, changes) {
    let { mutator } = this.context;
    let { item:project, boardAlias } = this.props;

    // TODO(burdon): Batch.
    // Update item for column.
    let batch = mutator.batch();
    let dropMutations = this.boardAdapter.onDropMutations(item, column);
    if (dropMutations) {

      batch.updateItem(item, dropMutations);
    }

    // Update item order.
    batch.updateItem(project, _.map(changes, change => ({
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

    batch.commit();
  }

  handleSave() {
    return [];
  }

  render() {
    return ReactUtil.render(this, () => {
      let { typeRegistry, registration: { groupId, userId } } = this.context;
      let { item:project, refetch, boardAlias } = this.props;
      let { itemOrderModel } = this.state;

      // All items for board.
      let items = _.get(project, 'tasks', []);

      // Get the appropriate board.
      let board = _.find(_.get(project, 'boards'), board => board.alias == boardAlias);
      itemOrderModel.setLayout(_.get(board, 'itemMeta', []));

      return (
        <Canvas ref="canvas"
                item={ project }
                refetch={ refetch }
                onSave={ this.handleSave.bind(this) }
                fields={{ description: false, debug: false }}>

          <Board item={ project }
                 items={ items }
                 columns={ this.boardAdapter.columns(project, board) }
                 columnMapper={ this.boardAdapter.columnMapper(groupId, userId) }
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

/**
 * Board toolbar
 */
export class ProjectCanvasToolbarComponent extends React.Component {

  handleSetBoardType(boardAlias) {
    this.props.setBoardAlias(boardAlias);
  }

  render() {
    let { boardAlias } = this.props;

    function className(type) {
      return DomUtil.className('ux-icon', 'ux-icon-action', (type === boardAlias) && 'ux-icon-active' );
    }

    return (
      <div>
        <i className={ className('status') } title="Status Board"
           onClick={ this.handleSetBoardType.bind(this, 'status') }>assessment</i>
        <i className={ className('assignee') } title="Team Board"
           onClick={ this.handleSetBoardType.bind(this, 'assignee') }>people</i>
        <i className={ className('private') } title="Private Board"
           onClick={ this.handleSetBoardType.bind(this, 'private') }>person</i>
      </div>
    );
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

  ${Fragments.ItemFragment}
  ${Fragments.ProjectBoardFragment}
  ${Fragments.TaskFragment}  
`;

export const ProjectBoardCanvas = compose(

  connectReducer(ItemReducer.graphql(ProjectBoardQuery)),

  connectWithRef((state, ownProps) => {
    let { canvas: { boardAlias='status' } } = AppAction.getState(state);
    return {
      boardAlias
    };
  })

)(ProjectBoardCanvasComponent);

export const ProjectCanvasToolbar = connect(
  (state, ownProps) => {
    let { canvas: { boardAlias='status' } } = AppAction.getState(state);
    return {
      boardAlias
    };
  },
  (dispatch, ownProps) => ({
    setBoardAlias: boardAlias => {
      dispatch(AppAction.setCanvasState({
        boardAlias
      }));
    }
  })
)(ProjectCanvasToolbarComponent);
