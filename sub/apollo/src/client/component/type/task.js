//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { MutationUtil, TypeUtil, ItemReducer } from 'minder-core';

import { UpdateItemMutation } from '../../data/mutations';
import { composeItem, CardContainer, ItemFragment } from '../item';

import ItemsPicker from '../items_picker';

/**
 * Type-specific fragment.
 */
const TaskFragment = gql`
  fragment TaskFragment on Task {
    bucket 
    status
    project {
      id
      title
    }
    owner {
      id
      title
    }
    assignee {
      id
      title
    }
  }
`;

/**
 * Type-specific query.
 */
const TaskQuery = gql`
  query TaskQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...TaskFragment
    }
  }

  ${ItemFragment}
  ${TaskFragment}  
`;

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

    TypeUtil.maybeAppend(mutations,
      MutationUtil.field('status', 'int', _.get(values, 'status'), _.get(item, 'status')));

    TypeUtil.maybeAppend(mutations,
      MutationUtil.field('assignee', 'id', _.get(values, 'assignee'), _.get(item, 'assignee.id')));

    return mutations;
  }

  render() {
    let { item, mutator, typeRegistry } = this.props;

    return (
      <CardContainer mutator={ mutator } typeRegistry={ typeRegistry} item={ item }
                     onSave={ this.handleSave.bind(this) }>
        <TaskLayout ref="item" item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
class TaskLayout extends React.Component {

  constructor() {
    super(...arguments);

    this.state = {
      itemId: null,
      values: {},
      items: {}
    }
  }

  componentWillReceiveProps(nextProps) {

    // TODO(burdon): mapStateToProps called every time Redux store is changed.
    // TODO(burdon): Understand and generalize this pattern.
    // TODO(burdon): handleSelectPicker, TaskCardComponent re-renders (why?) and this would overwrite the values
    //               with the old values in the item.

    let { item } = nextProps;
    if (_.get(item, 'id') != this.state.itemId) {
      this.setState({
        itemId: _.get(item, 'id'),
        items: {
          assignee: _.get(item, 'assignee')
        },
        values: {
          assignee: _.get(item, 'assignee.id'),
          status: _.get(item, 'status', 0)
        }
      });
    }
  }

  get values() {
    return this.state.values;
  }

  handleSelectPicker(property, item) {
    this.setState({
      items: _.set(this.state.items, property, item),
      values: _.set(this.state.values, property, item.id)
    });
  }

  handleSelectStatus(event) {
    this.setState({
      values: _.set(this.state.values, 'status', event.target.value)
    });
  }

  render() {
    let { item } = this.props;
    let { items, values } = this.state;
    let { status } = values;

    const userFilter = {
      type: 'User'
    };

    return (
      <div className="app-type-task ux-column ux-section">
        <div className="ux-data">

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
                         value={ _.get(items, 'assignee.title') }
                         onSelect={ this.handleSelectPicker.bind(this, 'assignee') }/>
          </div>

          <div className="ux-data-row">
            <div className="ux-data-label">Status</div>
            <select value={ status } onChange={ this.handleSelectStatus.bind(this) }>
              <option value="0">Unstarted</option>
              <option value="1">Assigned</option>
              <option value="2">Active</option>
              <option value="3">Complete</option>
            </select>
          </div>

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
  })
)(TaskCardComponent);
