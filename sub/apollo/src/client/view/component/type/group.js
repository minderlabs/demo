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

import List from '../list';
import ViewerList from '../viewer_list';
import { Path } from '../../../path';

import './group.less';

/**
 * Fragments.
 */
export const GroupFragments = {

  item: new Fragment(gql`
    fragment GroupFragment on Group {
      id 
      members {
        id
        type
        title
      
        tasks(filter: { predicate: { field: "assignee", ref: "id" } }) {
          id
          type
          bucket
          title
          labels
        }
      }
    }
  `),
};

/**
 * Group
 */
export default class Group extends React.Component {

  static contextTypes = {
    mutator: React.PropTypes.object.isRequired,
    navigator: React.PropTypes.object.isRequired
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

  /**
   * @param member: User or string ('private')
   */
  handleTaskAdd(member) {
    this.setState({
      inlineEdit: member.id || member
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

  handleTaskSave(assignee, save, text, event) {
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
          field: 'owner',
          value: {
            id: this.props.user.userId
          }
        }
      ];

      if (assignee && assignee.id) {
        mutations.push(
          {
            field: 'assignee',
              value: {
                id: assignee.id
              }
          });
      } else if (this.state.inlineEdit == 'private') {
        mutations.push(
          {
            field: 'bucket',
              value: {
                string: this.props.user.userId
              }
          }
        );
      }
      console.log('** MUTATIONS: ' + JSON.stringify(mutations)); // FIXME

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

  handleItemSelect(item) {
    this.context.navigator.toDetail(item);
  }

  render() {

    // TODO(madadam): When ACLs and links are working, query for all Tasks/Notes linked from this item (Group)
    // with private ACL.
    let privateNotesFilter = {
      bucket: this.props.user.userId
    };

    console.log('** bucket ' + this.props.user.userId); // FIXME

    // TODO(madadam): Need predicate tree to express unassigned? Current hack: empty string matches undefined fields.
    let sharedNotesFilter = {
      type: "Task",
      predicate: { field: "assignee", value: {string: ""}},
      bucket: this.props.item.id
    };

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

          {/*
           * Shared Notes
           */
          }
          <div className="app-banner app-row">
            <h3 className="app-expand">Shared Notes</h3>
            <i className="app-icon app-icon-add material-icons"
               onClick={ this.handleTaskAdd.bind(this, 'shared') }></i>
          </div>
          <div className="app-section app-expand">
            <List filter={ sharedNotesFilter } onItemSelect={ this.handleItemSelect.bind(this) }/>
          </div>
          {this.state.inlineEdit === 'shared' &&
          <div className="app-row app-data-row">
            <i className="material-icons">assignment_turned_in</i>
            <TextBox ref="task_create"
                     className="app-expand" autoFocus={ true }
                     onEnter={ this.handleTaskSave.bind(this, null, true) }
                     onCancel={ this.handleTaskSave.bind(this, null, false)} />
            <i className="app-icon app-icon-save material-icons"
               onClick={ this.handleTaskSave.bind(this, null) }>check</i>
            <i className="app-icon app-icon-cancel material-icons"
               onClick={ this.handleTaskSave.bind(this, null, false) }>cancel</i>
          </div>}

          {/*
            * Private Notes
           */
          }
          <div className="app-banner app-row">
            <h3 className="app-expand">Private Notes</h3>
            <i className="app-icon app-icon-add material-icons"
               onClick={ this.handleTaskAdd.bind(this, 'private') }></i>
          </div>
          <div className="app-section app-expand">
            <ViewerList filter={ privateNotesFilter } onItemSelect={ this.handleItemSelect.bind(this) }/>
          </div>
          {this.state.inlineEdit === 'private' &&
          <div className="app-row app-data-row">
            <i className="material-icons">assignment_turned_in</i>
            <TextBox ref="task_create"
                     className="app-expand" autoFocus={ true }
                     onEnter={ this.handleTaskSave.bind(this, null, true) }
                     onCancel={ this.handleTaskSave.bind(this, null, false)} />
            <i className="app-icon app-icon-save material-icons"
               onClick={ this.handleTaskSave.bind(this, null) }>check</i>
            <i className="app-icon app-icon-cancel material-icons"
               onClick={ this.handleTaskSave.bind(this, null, false) }>cancel</i>
          </div>}

        </div>
      </div>
    );
  }
}
