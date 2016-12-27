//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router';
import gql from 'graphql-tag';

import { ID, ItemReducer } from 'minder-core';
import { TextBox } from 'minder-ux';

import { UpdateItemMutation } from '../../data/mutations';
import { Path } from '../../path';
import { composeItem, CardContainer, ItemFragment } from '../item';
import { ItemList, UserTaskList } from '../list_factory';

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
class ProjectCard extends React.Component {

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

  static NOTE_TYPE = {
    SHARED:   '__shared__',
    PRIVATE:  '__private__'
  };

  // TODO(burdon): Move to card.
  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  constructor() {
    super(...arguments);

    this.state = {
      // Member ID or NOTE_TYPE.
      inlineEdit: false
    };
  }

  handleItemSelect(item) {
    this.context.navigator.pushDetail(item);
  }

  handleTaskAdd(memberId) {
    this.setState({
      inlineEdit: memberId
    });
  }

  // TODO(burdon): Factor out into list control.
  handleTaskSave(assignee, text, event) {
    let { user, item } = this.props;

    let title = this.refs.title.value;
    if (_.isEmpty(title)) {
      this.refs.title.focus();
      return;
    }

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
    if (assignee && assignee.id) {
      mutations.push({
        field: 'assignee',
        value: {
          id: assignee.id
        }
      });
    } else {
      // TODO(burdon): Set bucket in updateItem.
      // TODO(burdon): Factor out inline edit.
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

    this.setState({
      inlineEdit: null
    });
  }

  handleTaskCancel() {
    this.setState({
      inlineEdit: null
    });
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

    // TODO(burdon): Factor out list generators.

    const memberItem = (member) => (
      <div className="ux-section-header ux-row">
        <Link to={ Path.detail(ID.toGlobalId('User', member.id)) }>
          <i className="ux-icon">accessibility</i>
        </Link>
        <h3 className="ux-expand">{ member.title }</h3>
        <i className="ux-icon ux-icon-add"
           onClick={ this.handleTaskAdd.bind(this, member.id) }></i>
      </div>
    );

    const taskList = (member) => {
      return member.tasks.map(task => (
        <div key={ task.id } className="ux-list-item ux-row ux-data-row">
          <Link to={ Path.detail(ID.toGlobalId('Task', task.id)) }>
            <i className="ux-icon">assignment_turned_in</i>
          </Link>
          <div className="ux-text ux-expand">{ task.title }</div>
          <i className="ux-icon ux-icon-delete" onClick={ this.handleTaskDelete.bind(this, task) }>cancel</i>
        </div>
      ));
    };

    const itemEditor = (member, icon) => (
      <div className="ux-section ux-list-item ux-row ux-data-row">
        <i className="ux-icon">assignment_turned_in</i>
        <TextBox ref="title"
                 className="ux-expand" autoFocus={ true }
                 onEnter={ this.handleTaskSave.bind(this, member) }
                 onCancel={ this.handleTaskCancel.bind(this)} />
        <i className="ux-icon ux-icon-save" onClick={ this.handleTaskSave.bind(this, member) }>check</i>
        <i className="ux-icon ux-icon-cancel" onClick={ this.handleTaskCancel.bind(this) }>cancel</i>
      </div>
    );

    const sectionHeader = (title, type, filter) => (
      <div>
        <div className="ux-section-header ux-row">
          <h3 className="ux-expand">{ title }</h3>
          <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this, type) }></i>
        </div>
        <div className="ux-expand">
          <ItemList filter={ filter } onItemSelect={ this.handleItemSelect.bind(this) }/>
        </div>
      </div>
    );

    let sharedNotesFilter = {
      bucket: item.id,
      type: 'Task',
      expr: { field: 'assignee', value: { null: true }}
    };

    // TODO(madadam): When ACLs and links are working, query for all Tasks/Notes linked from this item (Group) with private ACL.
    let privateNotesFilter = {
      type: 'Task',
      bucket: user.id
    };

    return (
      <div className="app-type-project ux-column">
        <div className="ux-data">

          <div className="ux-list">
            {item.team.members.map(member => (

            <div key={ member.id }>
              { memberItem(member) }

              <div className="ux-list">
                { taskList(member) }
                { this.state.inlineEdit === member.id && itemEditor(member) }
              </div>
            </div>
            ))}
          </div>

          <div>
            { sectionHeader('Shared Notes', ProjectLayout.NOTE_TYPE.SHARED) }
            <ItemList filter={ sharedNotesFilter } onItemSelect={ this.handleItemSelect.bind(this) }/>
            { this.state.inlineEdit === ProjectLayout.NOTE_TYPE.SHARED && itemEditor() }
          </div>

          <div>
            { sectionHeader('Private Notes', ProjectLayout.NOTE_TYPE.PRIVATE) }
            <UserTaskList filter={ privateNotesFilter } onItemSelect={ this.handleItemSelect.bind(this) }/>
            { this.state.inlineEdit === ProjectLayout.NOTE_TYPE.PRIVATE && itemEditor() }
          </div>
        </div>
      </div>
    );
  }
}

/**
 * HOC.
 */
export default composeItem(
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
)(ProjectCard);
