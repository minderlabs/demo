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
 * Type-specific card container.
 */
class ProjectCanvasComponent extends React.Component {

  // TODO(burdon): By user (+shared/private)
  // TODO(burdon): By priority.

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
    board: null,
    itemOrderModel: new DragOrderModel()
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
      // Default board.
      board: _.get(project, 'boards[0].alias')
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
    let { board } = this.state;
    console.assert(board);

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
                // TODO(burdon): Use map transformation (same as server for optimistic results).
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
    mutator.updateItem(project, mutations);
  }

  handleSave() {
    console.log('HANDLE SAVE');
    return [];
  }

  render() {
    let { typeRegistry } = this.context;
    let { item:project={}, refetch, mutator } = this.props;
    let { itemOrderModel } = this.state;

    // Get the appropriate board.
    // TODO(burdon): Get from props.
    let boardAlias = "tasks";
    let board = _.find(_.get(project, 'boards'), board => board.alias == boardAlias);
    itemOrderModel.setLayout(_.get(board, 'itemMeta', []));

    let items = _.get(project, 'tasks', []);

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

    return (
      <Canvas ref="canvas" item={ project } mutator={ mutator } refetch={ refetch }
              onSave={ this.handleSave.bind(this)}>

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
// HOC.
//-------------------------------------------------------------------------------------------------

// TODO(burdon): Remove and use 2 board views.
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

const ProjectReducer = (matcher, context, previousResult, updatedItem) => {
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

export const ProjectCanvas = composeItem(
  new ItemReducer({
    query: {
      type: ProjectBoardQuery,
      path: 'item'
    },
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    reducer: ProjectReducer
  })
)(ProjectCanvasComponent);
