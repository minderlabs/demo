//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router';
import gql from 'graphql-tag';

import { ID, ItemReducer } from 'minder-core';
import { List, TextBox } from 'minder-ux';

import { UpdateItemMutation } from '../../data/mutations';
import { Path } from '../../path';
import { composeItem, CardContainer, ItemFragment } from '../item';
import { ItemList, UserTaskList, getWrappedList } from '../list_factory';

/**
 * Type-specific query.
 */
const ProjectQuery = gql`
  query ProjectQuery($itemId: ID!, $localItemId: ID!) {

    item(itemId: $itemId) {
      ...ItemFragment

      ... on Project {
        team {
          title
          members {
            id
            title

            tasks(filter: {
              type: "Task",
              expr: { 
                op: AND,
                expr: [
                  { field: "project", value: { id: $localItemId } }
                  { field: "assignee", ref: "id" },
                ]
              }
            }) {
              ...ItemFragment
              
              project {
                id
              }
            }
          }
        }
      }
    }
  }

  ${ItemFragment}
`;

/**
 * Type-specific reducer.
 */
const ProjectReducer = (matcher, context, previousResult, updatedItem) => {

  // Filter appropriate mutations.
  let assignee = _.get(updatedItem, 'assignee.id');
  if (assignee) {

    // Find the associated member.
    let members = _.get(previousResult, 'item.team.members');
    let memberIdx = _.findIndex(members, member => member.id === assignee);
    if (memberIdx != -1) {
      let member = members[memberIdx];
      let filter = { expr: { field: "assignee", value: { id: member.id } } };

      return {
        item: {
          team: {
            members: {
              [memberIdx]: {
                tasks: {
                  $apply: ItemReducer.listApplicator(matcher, context, filter, updatedItem)
                }
              }
            }
          }
        }
      };
    }
  }
};

/**
 * Type-specific card container.
 */
class ProjectCardComponent extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: React.PropTypes.object,
  };

  render() {
    let { user, item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item }>
        <ProjectLayout ref="item" user={ user } item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
class ProjectLayout extends React.Component {

  // TODO(burdon): Move to card.
  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  handleItemSelect(item) {
    this.context.navigator.pushDetail(item);
  }

  handleTaskAdd(list) {
    list.addItem();
  }

  // TODO(burdon): Make static and/or factor out (mutation logic) into list factory.
  handleTaskSave(user, item, member, task) {
    let title = task.title;

    // TODO(burdon): Generalize.
    let assignee = member;

    // Create task.
    let mutations = [
      {
        field: 'title',
        value: {
          string: title
        }
      },
      {
        field: 'owner',
        value: {
          id: user.id
        }
      },
      {
        field: 'project',
        value: {
          id: item.id
        }
      }
    ];

    // Handle notes.
    if (assignee && assignee.id) {    // TODO(burdon): Different logic from other task add.
      mutations.push({
        field: 'assignee',
        value: {
          id: assignee.id
        }
      });
    } else {
      console.log('SPECIAL');

      // TODO(burdon): Set bucket in updateItem.
      // TODO(burdon): Factor out inline edit.
      /*
      switch (this.state.inlineEdit) {
        case ProjectLayout.NOTE_TYPE.PRIVATE: {
          mutations.push({
            field: 'bucket',
            value: {
              string: user.id
            }
          });
          break;
        }

        case ProjectLayout.NOTE_TYPE.SHARED: {
          mutations.push({
            field: 'bucket',
            value: {
              string: item.id
            }
          });
          break;
        }
      }
      */
    }

    let taskId = this.context.mutator.createItem('Task', mutations);

    // Add to project.
    // TODO(burdon): Batch mutations atomically.
    mutations = [
      {
        field: 'tasks',
        value: {
          array: {
            value: {
              id: taskId
            }
          }
        }
      }
    ];

    this.context.mutator.updateItem(item, mutations);
  }

  // TODO(burdon): Move to card.
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

  render() {
    let { user, item } = this.props;

    // TODO(burdon): Standardize or move to factory.
    const taskItemRenderer = (list, item) => {
      return (
        <div className="ux-row ux-data-row">
          <Link to={ Path.detail(ID.toGlobalId('Task', item.id)) }>
            <i className="ux-icon">assignment_turned_in</i>
          </Link>
          <div className="ux-text ux-expand">{ item.title }</div>
          <i className="ux-icon ux-icon-delete"
             onClick={ this.handleTaskDelete.bind(this, item) }>cancel</i>
        </div>
      );
    };

    const handleTaskAdd = (listId) => this.handleTaskAdd(getWrappedList(this.refs[listId]));

    const sectionHeader = (title, listId) => (
      <div className="ux-section-header ux-row">
        <h3 className="ux-expand">{ title }</h3>
        <i className="ux-icon ux-icon-add"
           onClick={ handleTaskAdd.bind(this, listId) }></i>
      </div>
    );

    const sharedNotesFilter = {
      bucket: item.id,
      type: 'Task',
      expr: { field: 'assignee', value: { null: true } }
    };

    // TODO(madadam): When ACLs and links are working, query for all Tasks/Notes linked from this item (Group) with private ACL.
    const privateNotesFilter = {
      bucket: user.id,
      type: 'Task'
    };

    return (
      <div className="app-type-project ux-column">

        {/*
          * Team tasks.
          */}
        <div>
          {item.team.members.map(member => (
          <div key={ member.id }>
            {/*
              * Member header.
              */}
            <div className="ux-section-header ux-row">
              <Link to={ Path.detail(ID.toGlobalId('User', member.id)) }>
                <i className="ux-icon">accessibility</i>
              </Link>
              <h3 className="ux-expand">{ member.title }</h3>
              <i className="ux-icon ux-icon-add"
                 onClick={ this.handleTaskAdd.bind(this, this.refs['list-' + member.id]) }></i>
            </div>

            {/*
              * Member tasks.
              * TODO(burdon): Select.
            <List ref={ 'list-' + member.id }
                  items={ member.tasks }
                  itemRenderer={ taskItemRenderer }
                  onItemSelect={ this.handleItemSelect.bind(this) }
                  onItemSave={ this.handleTaskSave.bind(this, user, item, member) }/>
              */}
          </div>
          ))}
        </div>

        {/*
          * Shared notes.
          */}
        <div>
          { sectionHeader('Shared Notes', 'list-shared') }

          <ItemList ref="list-shared"
                    filter={ sharedNotesFilter }
                    onItemSelect={ this.handleItemSelect.bind(this) }/>
        </div>

        {/*
          * Private tasks.
          */}
        <div>
          { sectionHeader('Private Notes', 'list-private') }

          <UserTaskList ref="list-private"
                        filter={ privateNotesFilter }
                        onItemSelect={ this.handleItemSelect.bind(this) }/>
        </div>
      </div>
    );
  }
}

/**
 * HOC.
 */
export const ProjectCard = composeItem(
  new ItemReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: ProjectQuery,
      path: 'item'
    }
  },
  ProjectReducer)
)(ProjectCardComponent);
