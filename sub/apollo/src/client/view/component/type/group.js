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

import { Path } from '../../../path';

import './group.less';

/**
 * Fragments.
 */
export const GroupFragments = {

  item: new Fragment(gql`
    fragment GroupFragment on Group {
      members {
        id
        type
        title
      
        tasks(filter: { expr: { field: "assignee", ref: "id" } }) {
          id
          type
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
    user: React.PropTypes.object.isRequired,    // TODO(burdon): Add to all types.
    item: GroupFragments.item.propType
  };

  constructor() {
    super(...arguments);

    this.state = {
      // User ID of inline task.
      inlineEdit: null
    };
  }

  handleTaskAdd(member) {
    this.setState({
      inlineEdit: member.id
    });
  }

  handleTaskDelete(item) {
    console.log('DELETE: ', JSON.stringify(item));

    // TODO(burdon): Factor out (MutationUtil).
    let mutations = [
      {
        field: 'labels',
        value: {
          array: {
            index: 0,
            value: {
              string: '_deleted'
            }
          }
        }
      }
    ];

    // TODO(burdon): Transform $push returned object.
    this.context.mutator.updateItem(item, mutations);
  }

  handleTaskSave(member, save, text, event) {
    console.assert(member && member.id);

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
            id: this.props.user.userId
          }
        }
      ];

      this.context.mutator.createItem('Task', mutations);

      // Another.
      // TODO(burdon): Wait until commit?
      if (event && event.shiftKey) {
        return;
      }
    }

    this.setState({
      inlineEdit: null
    });
  }

  render() {

    // TODO(burdon): Factor out item row (use in inbox).

    return (
      <div className="app-column app-type-group">

        <div className="app-column app-expand">
          {/*
            * Team Member
            */}
          {this.props.item.members.map(member => (
          <div key={ member.id }>

            <div className="app-banner app-row">
              <Link to={ Path.detail('member', ID.toGlobalId('User', member.id)) }>
                <i className="material-icons">accessibility</i>
              </Link>
              <h3 className="app-expand">{ member.title }</h3>
              <i className="app-icon app-icon-add material-icons"
                 onClick={ this.handleTaskAdd.bind(this, member) }></i>
            </div>

            {/*
              * Task
              */}
            <div className="app-section">
              {member.tasks.map(task => (
              <div key={ task.id } className="app-row app-data-row">
                <Link to={ Path.detail('task', ID.toGlobalId('Task', task.id)) }>
                  <i className="material-icons">assignment_turned_in</i>
                </Link>
                <div className="app-text app-expand">{ task.title }</div>
                <i className="app-icon app-icon-delete material-icons"
                   onClick={ this.handleTaskDelete.bind(this, task) }>cancel</i>
              </div>
              ))}

              <div>{ this.state.inlineEdit && this.state.inlineEdit.id }</div>

              {/*
                * Edit
                */}
              {this.state.inlineEdit === member.id &&
              <div className="app-row app-data-row">
                <i className="material-icons">assignment_turned_in</i>
                <TextBox ref="task_create"
                         className="app-expand" autoFocus={ true }
                         onEnter={ this.handleTaskSave.bind(this, member, true) }
                         onCancel={ this.handleTaskSave.bind(this, member, false)} />
                <i className="app-icon app-icon-save material-icons"
                   onClick={ this.handleTaskSave.bind(this, member) }>check</i>
                <i className="app-icon app-icon-cancel material-icons"
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
