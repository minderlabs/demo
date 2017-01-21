//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'react-apollo';
import { Link } from 'react-router';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ID, ItemFragment, ItemReducer, MutationUtil, Mutator, TaskFragment } from 'minder-core';
import { List, ListItem } from 'minder-ux';

import { Path } from '../../path';
import { UpdateItemMutation } from '../../data/mutations';
import { composeItem } from '../item';
import { CardContainer } from '../card';

import ItemsPicker from '../items_picker';

import './task.less';

/**
 * Type-specific query.
 */
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

/**
 * Type-specific reducer.
 */
const TaskReducer = (matcher, context, previousResult, updatedItem) => {

  // Check not root item.
  if (previousResult.item.id != updatedItem.id) {
    return {
      item: {
        tasks: {
          $push: [ updatedItem ]
        }
      }
    }
  }
};

/**
 * Type-specific card container.
 */
class TaskCardComponent extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: propType(TaskFragment)
  };

  handleSave() {
    let { item } = this.props;
    let values = this.refs.item.values;

    // TODO(burdon): Cache isn't updated on mutation.
    // TODO(burdon): Utils to connect with state.values below?

    let mutations = [];

    if (!_.isEqual(_.get(values, 'status'), _.get(item, 'status'))) {
      mutations.push(MutationUtil.createFieldMutation('status', 'int', _.get(values, 'status')));
    }

    if (!_.isEqual(_.get(values, 'assignee', null), _.get(item, 'assignee'))) {
      mutations.push(MutationUtil.createFieldMutation('assignee', 'id', _.get(values, 'assignee')));
    }

    return mutations;
  }

  render() {
    let { user, item, mutator, refetch, typeRegistry } = this.props;

    return (
      <CardContainer mutator={ mutator } refetch={ refetch } typeRegistry={ typeRegistry} item={ item }
                     onSave={ this.handleSave.bind(this) }>
        <TaskLayout ref="item" user={ user } item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
class TaskLayout extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  state = {};

  componentWillReceiveProps(nextProps) {
    let { item } = nextProps;

    // TODO(burdon): mapStateToProps called every time Redux store is changed.
    // TODO(burdon): Understand and generalize this pattern.
    // TODO(burdon): handleSelectPicker, TaskCardComponent re-renders (why?) and this would overwrite the values
    //               with the old values in the item.

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
    this.context.navigator.push(Path.canvas(ID.toGlobalId('Task', item.id)));
  }

  handleTaskSave(item) {
    let { item:task, user } = this.props;
    console.assert(item);

    // TODO(burdon): Factor out mutations (see project.js).
    let taskId = this.context.mutator.createItem('Task', [
      {
        field: 'owner',
        value: {
          id: user.id
        }
      },
      {
        field: 'title',
        value: {
          string: item.title
        }
      }
    ]);

    this.context.mutator.updateItem(task, [
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
    ]);
  }

  handleTaskAdd() {
    this.refs.tasks.addItem();
  }

  render() {
    let { item={} } = this.props;
    let { assigneeText, status } = this.state;

    let userFilter = {
      type: 'User',
      text: assigneeText
    };

    // TODO(burdon): Generalize status (mapped to board column model).

    return (
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
            <ItemsPicker filter={ userFilter }
                         value={ assigneeText }
                         onTextChange={ this.handleSetText.bind(this, 'assigneeText') }
                         onItemSelect={ this.handleSetItem.bind(this, 'assignee') }/>
          </div>

          <div className="ux-data-row">
            <div className="ux-data-label">Status</div>
            <select value={ status } onChange={ this.handleSetStatus.bind(this) }>
              <option value="0">Unstarted</option>
              <option value="1">Assigned</option>
              <option value="2">Active</option>
              <option value="3">Complete</option>
            </select>
          </div>
        </div>

        <div>
          <div className="ux-section-header ux-row">
            <h3 className="ux-expand">Sub Tasks</h3>
            <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this) }></i>
          </div>

          <List ref="tasks"
                items={ item.tasks }
                onItemSave={ this.handleTaskSave.bind(this) }
                onItemSelect={ this.handleTaskSelect.bind(this) }/>
        </div>
      </div>
    );
  }
}

/**
 * HOC.
 */
export const TaskCard = composeItem(
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
)(TaskCardComponent);

/**
 * Compact card.
 */
// TODO(burdon): Wrapper for compact cards.
class TaskCompactCardComponent extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    item: React.PropTypes.object.isRequired
  };

  static propTypes = {
    mutator: React.PropTypes.object.isRequired
  };

  handleTaskSelect(item) {
    console.assert(item);
    this.context.navigator.push(Path.canvas(ID.toGlobalId('Task', item.id)));
  }

  handleToggleStatus(task) {
    let { mutator } = this.props;

    let status = (task.status == 0) ? 3 : 0;
    mutator.updateItem(task, [ MutationUtil.createFieldMutation('status', 'int', status) ]);
  }

  render() {
    let { item } = this.context;

    // TODO(burdon): Factor out (e.g., reuse in task detail above).
    const SubTaskRenderer = (task) => {
      let icon = (task.status == 3) ? 'done' : 'check_box_outline_blank';

      return (
        <ListItem item={ task }>
          <i className="ux-icon ux-icon-checkbox" onClick={ this.handleToggleStatus.bind(this, task) }>{ icon }</i>
          <ListItem.Title item={ task }/>
        </ListItem>
      );
    };

    return (
      <div className="ux-column">
        <div className="ux-header">
          <ListItem.Title/>
          <i className="ux-icon">edit</i>
        </div>

        <div className="ux-body">
          <div className="ux-text">{ _.get(item, 'assignee.title') }</div>
          <div className="ux-text-block ux-font-xsmall">{ _.get(item, 'description') }</div>

          <List items={ item.tasks }
                itemRenderer={ SubTaskRenderer }
                onItemSelect={ this.handleTaskSelect.bind(this) }/>

        </div>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  let { injector } = state.minder;

  return {
    injector
  };
};

/**
 * HOC.
 */
// TODO(burdon): Use composeItem.
export const TaskCompactCard = compose(
  connect(mapStateToProps),
  Mutator.graphql(UpdateItemMutation)
)(TaskCompactCardComponent);
