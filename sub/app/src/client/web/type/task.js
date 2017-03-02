//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import { Link } from 'react-router';
import { propType } from 'graphql-anywhere';
import gql from 'graphql-tag';

import { ID, ItemFragment, TaskFragment, ItemReducer, MutationUtil } from 'minder-core';
import { List, ListItem, Picker, ReactUtil } from 'minder-ux';

import { Path } from '../../common/path';
import { AppAction } from '../../common/reducers';

import { connectReducer } from '../framework/connector';
import { Canvas } from '../component/canvas';
import { Card } from '../component/card';

import './task.less';

// TODO(burdon): Get from query (see test.json).
export const TASK_LEVELS = [
  { value: 0, title: 'Unstarted'  },
  { value: 1, title: 'Active'     },
  { value: 2, title: 'Complete'   },
  { value: 3, title: 'Blocked'    }
];

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Status checkbox.
 */
const TaskStatus = ListItem.createInlineComponent((props, context) => {
  let { item } = context;

  // TODO(burdon): Const for status levels.
  // TODO(burdon): Generalize status (mapping to board column model).
  let icon = (item.status == 3) ? 'done' : 'check_box_outline_blank';
  const toggleStatus = () => {
    let status = (item.status == 0) ? 3 : 0;
    context.onItemUpdate(item, [
      MutationUtil.createFieldMutation('status', 'int', status)
    ]);
  };

  return (
    <i className="ux-icon ux-icon-checkbox" onClick={ toggleStatus }>{ icon }</i>
  );
});

/**
 * Renders task title and status checkbox.
 */
export const TaskListItemRenderer = (item) => {
  return (
    <ListItem item={ item }>
      <TaskStatus/>
      <ListItem.Title/>
    </ListItem>
  );
};

/**
 * Card.
 */
export class TaskCard extends React.Component {

  static TaskEditor = (props) => {
    let icon = <i className="material-icons">check_box_outline_blank</i>;
    return (
      <List.ItemEditor icon={ icon } { ...props }/>
    );
  };

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    registration: React.PropTypes.object,
    mutator: React.PropTypes.object,
  };

  static propTypes = {
    item: React.PropTypes.object
//  item: propType(TaskFragment)
  };

  handlTaskAdd() {
    this.refs.tasks.addItem();
  }

  handleItemSelect(item) {
    this.context.navigator.push(Path.canvas(ID.getGlobalId(item)));
  }

  handleItemUpdate(item, mutations) {
    let { registration: { groupId, userId }, mutator } = this.context;
    let { item:task } = this.props;

    if (item) {
      // Update existing.
      mutator.updateItem(item, mutations);
    } else {
      // Create and add to parent.
      mutator
        .batch()
        .createItem('Task', _.concat(
          MutationUtil.createFieldMutation('bucket', 'string', groupId),
          MutationUtil.createFieldMutation('project', 'id', task.project),
          MutationUtil.createFieldMutation('owner', 'id', userId),
          MutationUtil.createFieldMutation('status', 'int', 0),
          mutations
        ), 'task')
        .updateItem(this.props.item, [
          MutationUtil.createSetMutation('tasks', 'id', '${task}')
        ])
        .commit();
    }
  }

  render() {
    return ReactUtil.render(this, () => {
      let { mutator } = this.context;
      let { item:task } = this.props;
      let { assignee, tasks } = task;

      return (
        <Card ref="card" item={ task }>

          { assignee &&
          <div className="ux-card-section ux-font-xsmall">
            <span>Assigned: </span>
            <span>{ assignee.title }</span>
          </div>
          }

          <div className="ux-list-tasks">
            <List ref="tasks"
                  className="ux-list-tasks"
                  items={ tasks }
                  itemRenderer={ TaskListItemRenderer }
                  itemEditor={ TaskCard.TaskEditor }
                  onItemSelect={ this.handleItemSelect.bind(this) }
                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>

            { mutator &&
            <div>
              <i className="ux-icon ux-icon-add" onClick={ this.handlTaskAdd.bind(this) }/>
            </div>
            }
          </div>

        </Card>
      );
    });
  }
}

/**
 * Canvas.
 */
class TaskCanvasComponent extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    item: React.PropTypes.object,
  };

  state = {};

  componentWillReceiveProps(nextProps) {
    let { item } = nextProps;
    if (_.get(item, 'id') != this.state.itemId) {
      this.setState({
        itemId:         _.get(item, 'id'),
        assigneeText:   _.get(item, 'assignee.title'),
        assignee:       _.get(item, 'assignee.id'),
        status:         _.get(item, 'status', 0)
      });
    }
  }

  get canvas() {
    return this.refs.canvas;
  }

  handleSetItem(property, item) {
    this.setState({
      [property]: item.id
    });
  }

  handleSetText(property, value) {
    this.setState({
      [property]: value
    })
  }

  handleSetStatus(event) {
    this.setState({
      status: event.target.value
    });
  }

  handleTaskSelect(item) {
    console.assert(item);
    this.context.navigator.push(Path.canvas(ID.getGlobalId(item)));
  }

  handleTaskUpdate(item, mutations) {
    console.assert(mutations);
    let { mutator } = this.context;
    let { registration: { groupId, userId } } = this.props;

    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:parent } = this.props;
      let { bucket } = parent;

      mutator
        .batch()
        .createItem('Task', _.concat(
          MutationUtil.createFieldMutation('bucket', 'string', bucket),
          MutationUtil.createFieldMutation('project', 'id', parent.project),
          MutationUtil.createFieldMutation('owner', 'id', userId),
          MutationUtil.createFieldMutation('status', 'int', 0),
          mutations
        ), 'task')
        .updateItem(this.props.item, [
          MutationUtil.createSetMutation('tasks', 'id', '${task}')
        ])
        .commit();
    }
  }

  handleSave() {
    let { item } = this.props;

    let mutations = [];
    if (!_.isEqual(_.get(this.state, 'status', 0), _.get(item, 'status'))) {
      mutations.push(MutationUtil.createFieldMutation('status', 'int', _.get(this.state, 'status')));
    }

    let assigneeId = _.get(this.state, 'assignee');
    let currentAssigneeId = _.get(item, 'assignee.id');
    if (assigneeId && assigneeId !== currentAssigneeId) {
      mutations.push(MutationUtil.createFieldMutation('assignee', 'id', assigneeId));
    } else if (!assigneeId && currentAssigneeId) {
      mutations.push(MutationUtil.createFieldMutation('assignee'));
    }

    return mutations;
  }

  handleTaskAdd() {
    this.refs.tasks.addItem();
  }

  render() {
    return ReactUtil.render(this, () => {
      let { assigneeText, status } = this.state;
      let { item:task, refetch } = this.props;
      let { project, tasks } = task;

      const levels = TASK_LEVELS.map(level =>
        <option key={ level.value } value={ level.value }>{ level.title }</option>);

      return (
        <Canvas ref="canvas" item={ task } refetch={ refetch } onSave={ this.handleSave.bind(this)}>
          <div className="app-type-task ux-column">

            <div className="ux-section ux-data">
              <div className="ux-section-body">
                <div className="ux-data-row">
                  <div className="ux-data-label">Project</div>
                  <div className="ux-text">
                    { project &&
                    <Link to={ Path.canvas(ID.toGlobalId('Project', project.id)) }>{ project.title }</Link>
                    }
                  </div>
                </div>

                <div className="ux-data-row">
                  <div className="ux-data-label">Owner</div>
                  <div className="ux-text">{ _.get(task, 'owner.title') }</div>
                </div>

                <div className="ux-data-row">
                  <div className="ux-data-label">Assignee</div>
                  <MembersPicker value={ assigneeText || '' }
                                 onTextChange={ this.handleSetText.bind(this, 'assigneeText') }
                                 onItemSelect={ this.handleSetItem.bind(this, 'assignee') }/>
                </div>

                <div className="ux-data-row">
                  <div className="ux-data-label">Status</div>
                  <select value={ status } onChange={ this.handleSetStatus.bind(this) }>
                    { levels }
                  </select>
                </div>
              </div>
            </div>

            <div className="ux-section">
              <div className="ux-section-header ux-row">
                <h4 className="ux-expand ux-title">Sub Tasks</h4>
                <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this) }></i>
              </div>

              <div>
                <List ref="tasks"
                      className="ux-list-tasks"
                      items={ tasks }
                      itemRenderer={ TaskListItemRenderer }
                      itemEditor={ TaskCard.TaskEditor }
                      onItemSelect={ this.handleTaskSelect.bind(this) }
                      onItemUpdate={ this.handleTaskUpdate.bind(this) }/>
              </div>
            </div>
          </div>
        </Canvas>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC: Members Picker.
//-------------------------------------------------------------------------------------------------

const MembersQuery = gql`
  query MembersQuery($itemId: ID!) {
    group: item(itemId: $itemId) {
      ... on Group {
        members {
          type
          id
          title
        }
      }
    }
  }  
`;

const MembersPicker = compose(
  connect((state, ownProps) => {
    let { registration: { groupId } } = AppAction.getState(state);

    return {
      groupId
    }
  }),

  graphql(MembersQuery, {
    options: (props) => {
      let { groupId } = props;

      return {
        variables: {
          itemId: ID.toGlobalId('Group', groupId)
        }
      };
    },

    props: ({ ownProps, data }) => {
      let { loading, error, group={} } = data;
      let { members:items } = group;

      return {
        loading,
        error,
        items
      };
    }
  })
)(Picker);

//-------------------------------------------------------------------------------------------------
// HOC: TaskCanvas.
//-------------------------------------------------------------------------------------------------

const TaskQuery = gql`
  query TaskQuery($itemId: ID!) {
    item(itemId: $itemId) {
      ...ItemFragment
      ...TaskFragment
      
      # TODO(burdon): Possible bug (TaskFragment includes title, but sub tasks field also needs it).
      ... on Task {
        tasks {
          ...ItemFragment
          ...TaskFragment
        }
      }
    }
  }

  ${ItemFragment}
  ${TaskFragment}  
`;

export const TaskCanvas = compose(
  connectReducer(ItemReducer.graphql(TaskQuery))
)(TaskCanvasComponent);
