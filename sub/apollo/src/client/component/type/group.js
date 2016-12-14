//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router';
import gql from 'graphql-tag';
import { propType } from 'graphql-anywhere';

import { ID } from 'minder-core';
import { TextBox } from 'minder-ux';

import { composeItem, CardContainer, ItemFragment } from '../item';
import { ItemsList, UserTasksList } from '../list_factory';
import { Path } from '../../path';

import './group.less';

/**
 * Type-specific fragment.
 */
const GroupFragment = gql`
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
`;

/**
 * Type-specific reducer.
 *
 * @param context
 * @param matcher
 * @param previousResult
 * @param item
 */
const GroupReducer = (context, matcher, previousResult, item) => {

  // TODO(burdon): Factor out this comment and reference it.
  // The Reducer is called on mutation. When the generic UpdateItemMutation response is received we need
  // to tell Apollo how to stitch the result into the cached response. For item mutations, this is easy
  // since the ID is used to change the existing item. For adds and deletes, Apollo has no way of knowing
  // where the item should fit (e.g., for a flat list it depends on the sort order; for complex query shapes
  // (like Group) it could be on one (or more) of the branches (e.g., Second member's tasks).

  // TODO(burdon): First pass: factor out common parts with Reducer.
  // TODO(burdon): Holy grail would be to introspect the query and do this automatically (DESIGN DOC).

  // TODO(burdon): FIX: Not part of main query (e.g., shared notes).
  let assignee = _.get(item, 'assignee.id');
  if (!assignee) {
    return;
  }

  // Find associated member.
  let members = _.get(previousResult, 'item.members');
  let idx = _.findIndex(members, (member) => member.id === assignee);
  console.assert(idx != -1, 'Invalid ID: %s', assignee);

  // Add, update or remove.
  let member = members[idx];
  let tasks = member.tasks;
  let taskIdx = _.findIndex(tasks, (task) => task.id == item.id);

  // Create the resolver operator.
  let op = {
    $apply: (tasks) => {
      if (taskIdx == -1) {
        return [...tasks, item];
      } else {
        return _.compact(_.map(tasks, (task) => {
          if (task.id == item.id) {
            // TODO(burdon): Context.
            // TODO(burdon): Extract filter from query and use matcher to determine if remove.
            const filter = { expr: { field: "assignee", value: { id: member.id } } };
            if (matcher.matchItem(context, {}, filter, item)) {
              return item;
            }
          } else {
            return task;
          }
        }));
      }
    }
  };

  return { item: { members: { [idx]: { tasks: op } } } };
};

/**
 * Type-specific query.
 */
const GroupQuery = gql`
  query GroupQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...GroupFragment
    }
  }

  ${ItemFragment}
  ${GroupFragment}  
`;

/**
 * Type-specific card container.
 */
class GroupCard extends React.Component {

  static reducer = GroupReducer;

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: propType(GroupFragment)
  };

  render() {
    let { user, item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item }>
        <GroupLayout ref="item" user={ user } item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
class GroupLayout extends React.Component {

  static NOTE_TYPE = {
    PRIVATE:  '__private__',
    SHARED:   '__shared__'
  };

  // TODO(burdon): Move to card.
  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  constructor() {
    super(...arguments);

    this.state = {

      // User ID of inline task.
      // TODO(burdon): Move functionality into List component.
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

  // TODO(burdon): Move to card.
  // TODO(burdon): Don't pass item.
  handleTaskDelete(item) {
    // TODO(burdon): Use MutationUtil.
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
    let { user, item } = this.props;

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
            id: user.id
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
          case GroupLayout.NOTE_TYPE.PRIVATE: {
            mutations.push({
              field: 'bucket',
              value: {
                string: user.id
              }
            });
            break;
          }

          case GroupLayout.NOTE_TYPE.SHARED: {
            mutations.push({
              field: 'bucket',
              value: {
                string: item.id
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
    let { user, item } = this.props;
    if (!user || !item) {
      return null;
    }

    // TODO(madadam): When ACLs and links are working, query for all Tasks/Notes linked from this item (Group)
    // with private ACL.
    let privateNotesFilter = {
      bucket: user.id
    };

    // TODO(madadam): Use predicate tree to express unassigned? Current hack: empty string matches undefined fields.
    let sharedNotesFilter = {
      type: 'Task',
      expr: { field: 'assignee', value: { string: '' }},
      bucket: item.id
    };

    // TODO(burdon): Factor out item row (use in inbox).

    //return <div>{ JSON.stringify(user) }</div>;

    return (
      <div className="app-type-group ux-column">

        <div className="ux-column ux-expand">
          {/*
            * Team Member
            */}
          {item.members.map(member => (
          <div key={ member.id }>

            <div className="ux-section-header ux-row">
              <Link to={ Path.detail('Member', ID.toGlobalId('User', member.id)) }>
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
            * TODO(burdon): Factor out.
            * TODO(burdon): Note: since notes are not part of the main query, mutations should be handled
            *               internally to the associated ItemsList and UserTasksList controls.
            *
            * TODO(burdon): Move inline item creation into List.
            */}
          <div className="ux-section-header ux-row">
            <h3 className="ux-expand">Shared Notes</h3>
            <i className="ux-icon ux-icon-add"
               onClick={ this.handleTaskAdd.bind(this, GroupLayout.NOTE_TYPE.SHARED) }></i>
          </div>
          <div className="ux-expand">
            <ItemsList filter={ sharedNotesFilter } onItemSelect={ this.handleItemSelect.bind(this) }/>
          </div>
          {this.state.inlineEdit === GroupLayout.NOTE_TYPE.SHARED &&
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
               onClick={ this.handleTaskAdd.bind(this, GroupLayout.NOTE_TYPE.PRIVATE) }></i>
          </div>
          <div className="ux-expand">
            <UserTasksList filter={ privateNotesFilter } onItemSelect={ this.handleItemSelect.bind(this) }/>
          </div>
          {this.state.inlineEdit === GroupLayout.NOTE_TYPE.PRIVATE &&
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

/**
 * HOC.
 */
export default composeItem(GroupQuery)(GroupCard);
