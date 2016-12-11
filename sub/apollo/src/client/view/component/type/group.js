//
// Copyright 2016 Minder Labs.
//

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
      
        tasks(filter: { expr: { field: "assignee", ref: "id" } }) {
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

  static NOTE_TYPE = {
    PRIVATE:  '__private__',
    SHARED:   '__shared__'
  };

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
   * @param member: User ID or string ('private')
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
            id: this.props.user.id
          }
        }
      ];

      if (assignee && assignee.id) {
        mutations.push({
          field: 'assignee',
          value: {
            id: assignee.id
          }
        });
      } else {
        // TODO(burdon): Switch to using actual buckets.
        // TODO(burdon): Corruption of this.state.inlineEdit to use private/shared.
        switch (this.state.inlineEdit) {
          case Group.NOTE_TYPE.PRIVATE: {
            mutations.push({
              field: 'bucket',
              value: {
                string: this.props.user.id
              }
            });
            break;
          }

          case Group.NOTE_TYPE.SHARED: {
            mutations.push({
              field: 'bucket',
              value: {
                string: this.props.item.id
              }
            });
            break;
          }
        }
      }

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
    this.context.navigator.pushDetail(item);
  }

  render() {

    // TODO(madadam): When ACLs and links are working, query for all Tasks/Notes linked from this item (Group)
    // with private ACL.
    let privateNotesFilter = {
      bucket: this.props.user.id
    };

    // TODO(madadam): Use predicate tree to express unassigned? Current hack: empty string matches undefined fields.
    let sharedNotesFilter = {
      type: "Task",
      expr: { field: "assignee", value: { string: '' }},
      bucket: this.props.item.id
    };

    // TODO(burdon): Factor out item row (use in inbox).

    return (
      <div className="app-type-group ux-column">

        <div className="ux-column ux-expand">
          {/*
            * Team Member
            */}
          {this.props.item.members.map(member => (
          <div key={ member.id }>

            <div className="ux-section-header ux-row">
              <Link to={ Path.detail('member', ID.toGlobalId('User', member.id)) }>
                <i className="ux-icon">accessibility</i>
              </Link>
              <h3 className="ux-expand">{ member.title }</h3>
              <i className="ux-icon ux-icon-add"
                 onClick={ this.handleTaskAdd.bind(this, member) }></i>
            </div>

            {/*
              * Tasks
              * TODO(burdon): Create list abstraction for task list and inline edit.
              */}
            <div className="ux-list">
              {member.tasks.map(task => (
              <div key={ task.id } className="ux-list-item ux-row ux-data-row">
                <Link to={ Path.detail('task', ID.toGlobalId('Task', task.id)) }>
                  <i className="ux-icon">assignment_turned_in</i>
                </Link>
                <div className="ux-text ux-expand">{ task.title }</div>
                <i className="ux-icon ux-icon-delete"
                   onClick={ this.handleTaskDelete.bind(this, task) }>cancel</i>
              </div>
              ))}

              {/*
                * Edit
                */}
              {this.state.inlineEdit === member.id &&
              <div className="ux-list-item ux-row ux-data-row">
                <i className="ux-icon">assignment_turned_in</i>
                <TextBox ref="task_create"
                         className="ux-expand" autoFocus={ true }
                         onEnter={ this.handleTaskSave.bind(this, member, true) }
                         onCancel={ this.handleTaskSave.bind(this, member, false)} />
                <i className="ux-icon ux-icon-save"
                   onClick={ this.handleTaskSave.bind(this, member) }>check</i>
                <i className="ux-icon ux-icon-cancel"
                   onClick={ this.handleTaskSave.bind(this, member, false) }>cancel</i>
              </div>}
            </div>

          </div>
          ))}

          {/*
            * Shared Notes
            * TODO(burdon): Move inline item creation into List.
            */}
          <div className="ux-section-header ux-row">
            <h3 className="ux-expand">Shared Notes</h3>
            <i className="ux-icon ux-icon-add"
               onClick={ this.handleTaskAdd.bind(this, Group.NOTE_TYPE.SHARED) }></i>
          </div>
          <div className="ux-expand">
            <List filter={ sharedNotesFilter } onItemSelect={ this.handleItemSelect.bind(this) }/>
          </div>
          {this.state.inlineEdit === Group.NOTE_TYPE.SHARED &&
          <div className="ux-list">
            <div className="ux-list-item ux-row ux-data-row">
              <i className="ux-icon">assignment_turned_in</i>
              <TextBox ref="task_create"
                       className="ux-expand" autoFocus={ true }
                       onEnter={ this.handleTaskSave.bind(this, null, true) }
                       onCancel={ this.handleTaskSave.bind(this, null, false)} />
              <i className="ux-icon ux-icon-save"
                 onClick={ this.handleTaskSave.bind(this, null) }>check</i>
              <i className="ux-icon ux-icon-cancel"
                 onClick={ this.handleTaskSave.bind(this, null, false) }>cancel</i>
            </div>
          </div>}

          {/*
            * Private Notes
            */}
          <div className="ux-section-header ux-row">
            <h3 className="ux-expand">Private Notes</h3>
            <i className="ux-icon ux-icon-add"
               onClick={ this.handleTaskAdd.bind(this, Group.NOTE_TYPE.PRIVATE) }></i>
          </div>
          <div className="ux-expand">
            <ViewerList filter={ privateNotesFilter } onItemSelect={ this.handleItemSelect.bind(this) }/>
          </div>
          {this.state.inlineEdit === Group.NOTE_TYPE.PRIVATE &&
          <div className="ux-list">
            <div className="ux-list-item ux-row ux-data-row">
              <i className="ux-icon">assignment_turned_in</i>
              <TextBox ref="task_create"
                       className="ux-expand" autoFocus={ true }
                       onEnter={ this.handleTaskSave.bind(this, null, true) }
                       onCancel={ this.handleTaskSave.bind(this, null, false)} />
              <i className="ux-icon ux-icon-save"
                 onClick={ this.handleTaskSave.bind(this, null) }>check</i>
              <i className="ux-icon ux-icon-cancel"
                 onClick={ this.handleTaskSave.bind(this, null, false) }>cancel</i>
            </div>
          </div>}

        </div>
      </div>
    );
  }
}
