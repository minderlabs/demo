//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { Link } from 'react-router';
import gql from 'graphql-tag';
import { propType } from 'graphql-anywhere';

import { ID, MutationUtil, TypeUtil } from 'minder-core';
import { TextBox } from 'minder-ux';

import { Path } from '../../path';
import { composeItem, CardContainer, ItemFragment } from '../item';
import { ItemsList } from '../list_factory';

// TODO(burdon): Change current GroupCard to ProjectCard.
// TODO(burdon): New TeamCard should just show members (view of group).
// TODO(burdon): Project card should scope tasks by project ID.

/**
 * Type-specific fragment.
 */
const ProjectFragment = gql`
  fragment ProjectFragment on Project {

    tasks {
      ...ItemFragment
    }
  }

  ${ItemFragment}
`;

/**
 * Type-specific query.
 */
const ProjectQuery = gql`
  query ProjectQuery($itemId: ID!) {

    item(itemId: $itemId) {

      ... on Project {
        team {
          title
          members {
            ...ItemFragment

            tasks(filter: { expr: { field: "project", value: { id: $itemId } } }) {
              ...ItemFragment
            }
          }
        }
      }

      ...ItemFragment
      ...ProjectFragment
    }
  }

  ${ItemFragment}
  ${ProjectFragment}  
`;

/**
 * Type-specific card container.
 */
class ProjectCard extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: propType(ProjectFragment)
  };

  render() {
    let { item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item }>
        <ProjectLayout ref="item" item={ item }/>
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

  constructor() {
    super(...arguments);

    this.state = {
      inlineEdit: false
    };
  }

  handleTaskAdd() {
    this.setState({
      inlineEdit: true
    });
  }

  handleItemSelect(item) {
    this.context.navigator.pushDetail(item);
  }

  // TODO(burdon): Factor out into list control.
  handleTaskSave(assignee, text, event) {
    let { user, item } = this.props;

    let title = this.refs.task_title.value;
    if (_.isEmpty(title)) {
      this.refs.task_title.focus();
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
        field: 'project',
        value: {
          id: item.id
        }
      }
    ];

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

  render() {
    let { item, tasks } = this.props;

    // TODO(burdon): Alt query by Task.project.
    // TODO(burdon): Sort tasks by member/assignee.

    return (
      <div className="app-type-project ux-column ux-section">
        <div className="ux-data">

          {/*
            * Tasks
            */}
          <div className="ux-section-header ux-row">
            <h3 className="ux-expand">Tasks</h3>
            <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this) }></i>
          </div>
          <div className="ux-list">
            {item.tasks.map(task => (
            <div key={ task.id } className="ux-list-item ux-row ux-data-row">
              <Link to={ Path.detail('task', ID.toGlobalId('Task', task.id)) }>
                <i className="ux-icon">assignment_turned_in</i>
              </Link>
              <div className="ux-text ux-expand">{ task.title }</div>
              <i className="ux-icon ux-icon-delete"
                 onClick={ this.handleTaskDelete.bind(this, task) }>cancel</i>
            </div>
            ))}
          </div>
          {this.state.inlineEdit &&
          <div className="ux-list">
            <div className="ux-list-item ux-row ux-data-row">
              <i className="ux-icon">assignment_turned_in</i>
              <TextBox ref="task_title"
                       className="ux-expand" autoFocus={ true }
                       onEnter={ this.handleTaskSave.bind(this) }
                       onCancel={ this.handleTaskCancel.bind(this)} />
              <i className="ux-icon ux-icon-save"
                 onClick={ this.handleTaskSave.bind(this) }>check</i>
              <i className="ux-icon ux-icon-cancel"
                 onClick={ this.handleTaskCancel.bind(this) }>cancel</i>
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
export default composeItem(ProjectQuery)(ProjectCard);
