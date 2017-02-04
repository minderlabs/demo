//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ID, ItemFragment, TaskFragment, UpdateItemMutation, ItemReducer, MutationUtil } from 'minder-core';
import { List, ListItem } from 'minder-ux';

import { Path } from '../path';
import { composeItem } from '../framework/item_factory';
import { FilteredItemsPicker } from '../component/items_picker';
import { Canvas } from '../component/canvas';
import { Card } from '../component/card';

import './task.less';

// TODO(burdon): Get from query (see test.json).
export const TASK_LEVELS = [
  { value: 0, title: 'Unstarted'  },
  { value: 1, title: 'Active'     },
  { value: 2, title: 'Complete'   },
  { value: 3, title: 'Blocked'    }
];

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

const TaskStatus = ListItem.createInlineComponent((props, context) => {
  let { item } = context;

  // TODO(burdon): Const for status levels.
  // TODO(burdon): Generalize status (mapping to board column model).
  let icon = (item.status == 3) ? 'done' : 'check_box_outline_blank';
  const toggleStatus = () => {
    let status = (item.status == 0) ? 3 : 0;
    context.onItemUpdate(item, [
      MutationUtil.createFieldMutation('status', 'int', status)
    ]);
  };

  return (
    <i className="ux-icon ux-icon-checkbox" onClick={ toggleStatus }>{ icon }</i>
  );
});

/**
 * Renders task title and status checkbox.
 */
export const TaskListItemRenderer = (item) => {
  return (
    <ListItem item={ item }>
      <TaskStatus/>
      <ListItem.Title/>
    </ListItem>
  );
};

/**
 * Card.
 */
export class TaskCard extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object
  };

  static propTypes = {
    item: propType(TaskFragment)
  };

  handleItemSelect(item) {
    this.context.navigator.push(Path.canvas(ID.getGlobalId(item)));
  }

  handleItemUpdate(item, mutations) {
    this.context.mutator && this.context.mutator.updateItem(item, mutations);
  }

  render() {
    let { item } = this.props;
    let { assignee, description='', tasks } = item;

    return (
      <Card ref="card" item={ item }>
        { description &&
        <div className="ux-font-xsmall">{ description }</div>
        }

        <List items={ tasks }
              itemRenderer={ TaskListItemRenderer }
              onItemSelect={ this.handleItemSelect.bind(this) }
              onItemUpdate={ this.handleItemUpdate.bind(this) }/>

        { assignee &&
        <div>
          <span className="ux-font-xsmall">Assigned: </span>
          <span>{ assignee.title }</span>
        </div>
        }
      </Card>
    );
  }
}

/**
 * Canvas.
 */
class TaskCanvasComponent extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    mutator: React.PropTypes.object.isRequired,
    user: React.PropTypes.object.isRequired,
    item: propType(TaskFragment)
  };

  state = {};

  componentWillReceiveProps(nextProps) {
    let { item } = nextProps;
    if (_.get(item, 'id') != this.state.itemId) {
      this.setState({
        itemId:         _.get(item, 'id'),
        assigneeText:   _.get(item, 'assignee.title'),
        assignee:       _.get(item, 'assignee.id'),
        status:         _.get(item, 'status', 0)
      });
    }
  }

  get values() {
    return _.pick(this.state, ['assignee', 'status']);
  }

  handleSetItem(property, item) {
    this.setState({
      [property]: item.id
    });
  }

  handleSetText(property, value) {
    this.setState({
      [property]: value
    })
  }

  handleSetStatus(event) {
    this.setState({
      status: event.target.value
    });
  }

  handleTaskSelect(item) {
    console.assert(item);
    this.context.navigator.push(Path.canvas(ID.getGlobalId(item)));
  }

  handleTaskUpdate(item, mutations) {
    console.assert(mutations);
    if (item) {
      this.props.mutator.updateItem(item, mutations);
    } else {
      this.props.mutator.createItem('Task', mutations);
    }
  }

  handleSave() {
    let { item } = this.props;

    let mutations = [];

    if (!_.isEqual(_.get(this.state, 'status', 0), _.get(item, 'status'))) {
      mutations.push(MutationUtil.createFieldMutation('status', 'int', _.get(this.state, 'status')));
    }

    let assigneeId = _.get(this.state, 'assignee');
    let currentAssigneeId = _.get(item, 'assignee.id');
    if (assigneeId && assigneeId !== currentAssigneeId) {
      mutations.push(MutationUtil.createFieldMutation('assignee', 'id', assigneeId));
    } else if (!assigneeId && currentAssigneeId) {
      mutations.push(MutationUtil.createFieldMutation('assignee'));
    }

    return mutations;
  }

  handleTaskAdd() {
    this.refs.tasks.addItem();
  }

  render() {
    let { mutator, refetch, item={} } = this.props;
    let { assigneeText, status } = this.state;

    let userFilter = {
      type: 'User',
      text: assigneeText
    };

    let levels = TASK_LEVELS.map(level =>
      <option key={ level.value } value={ level.value }>{ level.title }</option>);

    return (
      <Canvas ref="canvas" item={ item } mutator={ mutator } refetch={ refetch } onSave={ this.handleSave.bind(this)}>
        <div className="app-type-task ux-column">

          <div className="ux-section ux-data">
            <div className="ux-data-row">
              <div className="ux-data-label">Project</div>
              <div className="ux-text">{ _.get(item, 'project.title') }</div>
            </div>

            <div className="ux-data-row">
              <div className="ux-data-label">Owner</div>
              <div className="ux-text">{ _.get(item, 'owner.title') }</div>
            </div>

            <div className="ux-data-row">
              <div className="ux-data-label">Assignee</div>
              <FilteredItemsPicker filter={ userFilter }
                                   value={ assigneeText }
                                   onTextChange={ this.handleSetText.bind(this, 'assigneeText') }
                                   onItemSelect={ this.handleSetItem.bind(this, 'assignee') }/>
            </div>

            <div className="ux-data-row">
              <div className="ux-data-label">Status</div>
              <select value={ status } onChange={ this.handleSetStatus.bind(this) }>
                { levels }
              </select>
            </div>
          </div>

          <div>
            <div className="ux-section-header ux-row">
              <h4 className="ux-expand ux-title">Sub Tasks</h4>
              <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this) }></i>
            </div>

            <List ref="tasks"
                  items={ item.tasks }
                  itemRenderer={ TaskListItemRenderer }
                  onItemSelect={ this.handleTaskSelect.bind(this) }
                  onItemUpdate={ this.handleTaskUpdate.bind(this) }/>
          </div>
        </div>
      </Canvas>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const TaskQuery = gql`
  query TaskQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...TaskFragment
      
      ... on Task {
        tasks {
          ...TaskFragment
        }
      }
    }
  }

  ${ItemFragment}
  ${TaskFragment}  
`;

const TaskReducer = (matcher, context, previousResult, updatedItem) => {

  // Check not root item.
  if (previousResult.item.id != updatedItem.id) {
    let taskIdx = _.findIndex(previousResult.item.tasks, task => task.id == updatedItem.id);
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
      };
    } else {
      // Add task (to bottom).
      return {
        item: {
          tasks: {
            $push: [ updatedItem ]
          }
        }
      };
    }
  }
};

export const TaskCanvas = composeItem(
  new ItemReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: TaskQuery,
      path: 'item'
    }
  },
  TaskReducer)
)(TaskCanvasComponent);
