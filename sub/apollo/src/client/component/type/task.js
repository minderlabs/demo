//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import gql from 'graphql-tag';
import { propType } from 'graphql-anywhere';

import { MutationUtil, TypeUtil } from 'minder-core';

import { composeItem, CardContainer, ItemFragment } from '../item';

import ItemsPicker from '../items_picker';

/**
 * Type-specific fragment.
 */
const TaskFragment = gql`
  fragment TaskFragment on Task {
    bucket  
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
class TaskCard extends React.Component {

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
    let { item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item } onSave={ this.handleSave.bind(this) }>
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
    let { item } = this.props;

    let filter = {
      type: 'User'
    };

    return (
      <div className="app-type-task ux-column ux-section">
        <div className="ux-data">
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
        </div>
      </div>
    );
  }
}

/**
 * HOC.
 */
export default composeItem(TaskQuery)(TaskCard);
