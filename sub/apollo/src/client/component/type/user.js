//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router';
import gql from 'graphql-tag';
import { propType } from 'graphql-anywhere';

import { ID } from 'minder-core';

import { composeItem, CardContainer, ItemFragment } from '../item';

/**
 * Type-specific fragment.
 */
const UserFragment = gql`
  fragment UserFragment on User {
    title

    ownerTasks: tasks(filter: { expr: { field: "owner", ref: "id" } }) {
      id
      title
    }

    assigneeTasks: tasks(filter: { expr: { field: "assignee", ref: "id" } }) {
      id
      title
    }
  }
`;

/**
 * Type-specific query.
 */
const UserQuery = gql`
  query UserQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...UserFragment
    }
  }

  ${ItemFragment}
  ${UserFragment}  
`;

/**
 * Type-specific card container.
 */
class UserCard extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: propType(UserFragment)
  };

  render() {
    let { item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item }>
        <UserLayout ref="item" item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
class UserLayout extends React.Component {

  render() {
    let { item } = this.props;

    // TODO(burdon): Use List controls.

    return (
      <div className="app-type-user ux-column">

        <div className="ux-section-header ux-row">
          <h3 className="ux-expand">Owned</h3>
          <i className="ux-icon">add</i>
        </div>
        <div className="ux-list">
          {item.ownerTasks.map(task => (
            <div key={ task.id } className="ux-list-item ux-row">
              <Link to={ '/task/' + ID.toGlobalId('Task', task.id) }>
                <i className="ux-icon">assignment_turned_in</i>
              </Link>
              <div className="ux-expand">{ task.title }</div>
            </div>
          ))}
        </div>

        <div className="ux-section-header ux-row">
          <h3 className="ux-expand">Assigned</h3>
        </div>
        <div className="ux-list">
          {item.assigneeTasks.map(task => (
            <div key={ task.id } className="ux-list-item ux-row">
              <Link to={ '/task/' + ID.toGlobalId('Task', task.id) }>
                <i className="ux-icon">assignment_turned_in</i>
              </Link>
              <div className="ux-expand">{ task.title }</div>
            </div>
          ))}
        </div>

      </div>
    );
  }
}

/**
 * HOC.
 */
export default composeItem(UserQuery)(UserCard);
