//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { Link } from 'react-router';
import Fragment from 'graphql-fragments';
import gql from 'graphql-tag';

import Database from '../../../data/database';

/**
 * Fragments.
 */
export const UserFragments = {

  // TODO(burdon): Pass variables to fragments (e.g., filter tasks)?
  // https://github.com/apollostack/react-apollo/issues/140
  // https://github.com/apollostack/react-apollo/issues/122

  item: new Fragment(gql`
    fragment UserFragment on User {
      title

      ownerTasks: tasks(filter: { predicate: { field: "owner" } }) {
        id
        title
      }

      assigneeTasks: tasks(filter: { predicate: { field: "assignee" } }) {
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
      <div>
        <h2>Tasks</h2>

        <div className="app-row">
          <h3 className="app-expand">Owned</h3>
          <i className="material-icons">add</i>
        </div>
        <div>
          {this.props.item.ownerTasks.map(task => (
            <div key={ task.id } className="app-row">
              <Link to={ '/task/' + Database.toGlobalId('Task', task.id) }>
                <i className="material-icons">assignment_turned_in</i>
              </Link>
              <div className="app-expand">{ task.title }</div>
            </div>
          ))}
        </div>

        <div className="app-row">
          <h3 className="app-expand">Assigned</h3>
        </div>
        <div>
          {this.props.item.assigneeTasks.map(task => (
            <div key={ task.id } className="app-row">
              <Link to={ '/task/' + Database.toGlobalId('Task', task.id) }>
                <i className="material-icons">assignment_turned_in</i>
              </Link>
              <div className="app-expand">{ task.title }</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
