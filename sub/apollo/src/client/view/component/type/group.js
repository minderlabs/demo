//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { Link } from 'react-router';
import Fragment from 'graphql-fragments';
import gql from 'graphql-tag';

import { ID } from 'minder-core';
import { TextBox } from 'minder-ux';

/**
 * Fragments.
 */
export const GroupFragments = {

  item: new Fragment(gql`
    fragment GroupFragment on Group {
      members {
        id
        title
      
        tasks(filter: { predicate: { field: "assignee" } }) {
          id
          title
        }
      }
    }
  `)

};

/**
 * Group
 */
export default class Group extends React.Component {

  static contextTypes = {
    mutator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    userId: React.PropTypes.string.isRequired,
    item: GroupFragments.item.propType
  };

  constructor() {
    super(...arguments);

    this.state = {
      inlineEdit: null
    };
  }

  handleAddTask(member) {
    this.setState({
      inlineEdit: member
    });
  }

  handleCreateTask(member, text) {
    let mutation = [
      {
        field: 'title',
        value: {
          string: text
        }
      },
      {
        field: 'assignee',
        value: {
          id: member.id
        }
      },
      {
        field: 'owner',
        value: {
          id: this.props.userId
        }
      }
    ];

    this.context.mutator.createItem('Task', mutation);

    this.setState({
      inlineEdit: null
    })
  }

  render() {
    return (
      <div>
        <h2>Team Agenda</h2>
        <div>
          {this.props.item.members.map(member => (
          <div key={ member.id }>

            <div className="app-row">
              <Link to={ '/member/' + ID.toGlobalId('User', member.id) }>
                <i className="material-icons">accessibility</i>
              </Link>
              <h3 className="app-expand">{ member.title }</h3>
              <i className="material-icons" onClick={ this.handleAddTask.bind(this, member) }>add</i>
            </div>

            <div>
              {member.tasks.map(task => (
              <div key={ task.id } className="app-row">
                <Link to={ '/task/' + ID.toGlobalId('Task', task.id) }>
                  <i className="material-icons">assignment_turned_in</i>
                </Link>
                <div className="app-expand">{ task.title }</div>
              </div>
              ))}

              <div className="app-row">
                {this.state.inlineEdit === member &&
                <TextBox className="app-expand" autoFocus={ true }
                         onEnter={ this.handleCreateTask.bind(this, member) }/>}
              </div>
            </div>

          </div>
          ))}
        </div>
      </div>
    );
  }
}
