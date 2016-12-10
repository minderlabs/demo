//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { Link } from 'react-router';
import Fragment from 'graphql-fragments';
import gql from 'graphql-tag';

import { ID } from 'minder-core';

/**
 * Fragments.
 */
export const UserFragments = {

  // TODO(burdon): Use ref in tasks filter.

  // TODO(burdon): Pass variables to fragments (e.g., filter tasks)?
  // https://github.com/apollostack/react-apollo/issues/140
  // https://github.com/apollostack/react-apollo/issues/122

  item: new Fragment(gql`
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
  `)

};

/**
 * User
 */
export default class User extends React.Component {

  static propTypes = {
    item: UserFragments.item.propType
  };

  render() {
    return (
      <div className="app-type-user ux-column">
        <div className="ux-section">
          <h2>Tasks</h2>

          <div className="ux-row">
            <h3 className="ux-expand">Owned</h3>
            <i className="ux-icon">add</i>
          </div>
          <div>
            {this.props.item.ownerTasks.map(task => (
              <div key={ task.id } className="ux-row">
                <Link to={ '/task/' + ID.toGlobalId('Task', task.id) }>
                  <i className="ux-icon">assignment_turned_in</i>
                </Link>
                <div className="ux-expand">{ task.title }</div>
              </div>
            ))}
          </div>

          <div className="ux-row">
            <h3 className="ux-expand">Assigned</h3>
          </div>
          <div>
            {this.props.item.assigneeTasks.map(task => (
              <div key={ task.id } className="ux-row">
                <Link to={ '/task/' + ID.toGlobalId('Task', task.id) }>
                  <i className="ux-icon">assignment_turned_in</i>
                </Link>
                <div className="ux-expand">{ task.title }</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}
