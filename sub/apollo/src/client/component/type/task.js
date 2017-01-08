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
    let values = this.refs.item.values;
    let { item } = this.props;

    let mutations = [];

    TypeUtil.maybeAppend(mutations,
      MutationUtil.field('assignee', 'id', _.get(values, 'assignee'), _.get(item, 'assignee.id')));

    return mutations;
  }

  render() {
    let { item, mutator } = this.props;

    return (
      <CardContainer mutator={ mutator } item={ item } onSave={ this.handleSave.bind(this) }>
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

    this._values = {};
  }

  get values() {
    return this._values;
  }

  handleSelectPicker(property, item) {
    _.set(this._values, property, item.id);
  }

  render() {
    let { item={} } = this.props;

    let filter = {
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
            <ItemsPicker filter={ filter }
                         value={ _.get(item, 'assignee.title') }
                         onSelect={ this.handleSelectPicker.bind(this, 'assignee') }/>
          </div>

          <div className="ux-data-row">
            <div className="ux-data-label">Status</div>
            <select value={ item.status }>
              <option id="0">Unstarted</option>
              <option id="1">Assigned</option>
              <option id="2">Active</option>
              <option id="3">Complete</option>
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
