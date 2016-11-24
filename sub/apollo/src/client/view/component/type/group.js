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

import './group.less';

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

  handleTaskAdd(member) {
    this.setState({

      // Add task for member.
      inlineEdit: member
    });
  }

  handleTaskSave(member, save) {
    if (save !== false) {
      let text = this.refs.task_create.value;
      if (_.isEmpty(text)) {
        this.refs.task_create.focus();
        return;
      }

      let mutations = [
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

      this.context.mutator.createItem('Task', mutations);
    }

    this.setState({
      inlineEdit: null
    })
  }

  render() {
    return (
      <div className="app-column app-type-group">

        <div className="app-column app-expand">
          {this.props.item.members.map(member => (
          <div key={ member.id }>

            <div className="app-banner app-row">
              <Link to={ '/member/' + ID.toGlobalId('User', member.id) }>
                <i className="material-icons">accessibility</i>
              </Link>
              <h3 className="app-expand">{ member.title }</h3>
              <i className="app-icon-add material-icons"
                 onClick={ this.handleTaskAdd.bind(this, member) }></i>
            </div>

            <div className="app-section">
              {member.tasks.map(task => (
              <div key={ task.id } className="app-row app-data-row">
                <Link to={ '/task/' + ID.toGlobalId('Task', task.id) }>
                  <i className="material-icons">assignment_turned_in</i>
                </Link>
                <div className="app-text app-expand">{ task.title }</div>
              </div>
              ))}

              {this.state.inlineEdit === member &&
              <div className="app-row app-data-row">
                <i className="material-icons">assignment_turned_in</i>
                <TextBox ref="task_create"
                         className="app-expand" autoFocus={ true }
                         onEnter={ this.handleTaskSave.bind(this, member) }/>
                <i className="app-icon-save material-icons"
                   onClick={ this.handleTaskSave.bind(this, member) }>check</i>
                <i className="app-icon-cancel material-icons"
                   onClick={ this.handleTaskSave.bind(this, member, false) }>cancel</i>
              </div>}
            </div>

          </div>
          ))}
        </div>
      </div>
    );
  }
}
