//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { compose, graphql } from 'react-apollo';
import { Link } from 'react-router';
import gql from 'graphql-tag';

import { ID, Fragments, ItemReducer, MutationUtil } from 'minder-core';
import { List, ListItem, ListItemEditor, Picker, ReactUtil } from 'minder-ux';

import { TASK_LEVELS } from '../../../common/const';

import { Path } from '../../common/path';

import { connectReducer } from '../framework/connector';
import { Canvas } from '../component/canvas';
import { Card } from '../component/card';

import './task.less';

/**
 * Add mutations to the batch to create the new item and add it to the parent.
 * @param mutator
 * @param {User} user
 * @param {Task} parent
 * @param mutations
 * @return {Batch}
 * @constructor
 */
// TODO(burdon): Factor out helpers.
const CreateTask = (mutator, user, parent, mutations) => {
  console.assert(parent.project);
  return mutator
    .batch(parent.project.bucket)
    .createItem('Task', _.concat(mutations, [
      MutationUtil.createFieldMutation('project', 'id',   parent.project.id),
      MutationUtil.createFieldMutation('owner',   'id',   user.id),
      MutationUtil.createFieldMutation('status',  'int',  TASK_LEVELS.UNSTARTED),
    ]), 'new_task')
    .updateItem(parent, [
      MutationUtil.createSetMutation('tasks', 'id', '${new_task}')
    ]);
};

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Status checkbox.
 */
const TaskStatus = ListItem.createInlineComponent((props, context) => {
  let { item } = context;

  // TODO(burdon): Generalize status (mapping to board column model).
  let icon = (item.status === TASK_LEVELS.COMPLETE) ? 'done' : 'check_box_outline_blank';
  const toggleStatus = () => {
    let status = (item.status === TASK_LEVELS.UNSTARTED) ? TASK_LEVELS.COMPLETE : TASK_LEVELS.UNSTARTED;
    context.onItemUpdate(item, [
      MutationUtil.createFieldMutation('status', 'int', status)
    ]);
  };

  return (
    <div>
      <i className="ux-icon ux-icon-checkbox" onClick={ toggleStatus }>{ icon }</i>
    </div>
  );
});

/**
 * Renders task title and status checkbox.
 */
export const TaskItemRenderer = (item) => {
  return (
    <ListItem item={ item }>
      <TaskStatus/>
      <ListItem.Text value={ item.title }/>
      <ListItem.EditButton/>
    </ListItem>
  );
};

/**
 * Renders task editor.
 */
export const TaskItemEditor = (item) => {
  return (
    <ListItemEditor item={ item }>
      <ListItem.Icon icon="check_box_outline_blank"/>
      <ListItem.Edit field="title"/>
      <ListItem.EditorButtons/>
    </ListItemEditor>
  );
};

/**
 * Card.
 */
export class TaskCard extends React.Component {

  static contextTypes = {
    navigator: PropTypes.object.isRequired,
    mutator: PropTypes.object.isRequired,
    viewer: PropTypes.object.isRequired
  };

  static propTypes = {
    item: PropTypes.object.isRequired
  };

  handlTaskAdd() {
    this.refs.tasks.addItem();
  }

  handleTaskSelect(item) {
    this.context.navigator.push(Path.canvas(ID.getGlobalId(item)));
  }

  handleTaskUpdate(item, mutations) {
    let { viewer: {user}, mutator } = this.context;

    if (item) {
      mutator.batch(item.bucket).updateItem(item, mutations).commit();
    } else {
      let { item:parent } = this.props;
      CreateTask(mutator, user, parent, mutations).commit();
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

          <List ref="tasks"
                className="ux-list-tasks"
                items={ tasks }
                itemEditor={ TaskItemEditor }
                itemRenderer={ TaskItemRenderer }
//              onItemSelect={ this.handleTaskSelect.bind(this) }
                onItemUpdate={ this.handleTaskUpdate.bind(this) }/>

          { mutator && task.project &&
          <div className="ux-card-footer">
            <i className="ux-icon ux-icon-add" onClick={ this.handlTaskAdd.bind(this) }/>
          </div>
          }

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
    navigator: PropTypes.object.isRequired,
    mutator: PropTypes.object.isRequired,
    viewer: PropTypes.object.isRequired
  };

  static propTypes = {
    item: PropTypes.object,
  };

  state = {};

  componentWillReceiveProps(nextProps) {
    let { item } = nextProps;
    if (_.get(item, 'id') !== this.state.itemId) {
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
    let { viewer: { user }, mutator } = this.context;

    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      let { item:parent } = this.props;
      CreateTask(mutator, user, parent, mutations).commit();
    }
  }

  handleTaskAdd() {
    this.refs.tasks.addItem();
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

  render() {
    return ReactUtil.render(this, () => {
      let { assigneeText, status } = this.state;
      let { item:task, refetch } = this.props;
      let { project, tasks } = task;

      // TODO(burdon): This shouldn't happen. Apollo serving from cache?
      if (!this.props.loading && !task.project) {
        console.warn('Finished loading but missing project: ' + JSON.stringify(task));
        return <div/>;
      }

      const levels = _.keys(TASK_LEVELS.properties).sort().map(level =>
        <option key={ level } value={ level }>{ TASK_LEVELS.properties[level].title }</option>);

      return (
        <Canvas ref="canvas"
                item={ task }
                refetch={ refetch }
                onSave={ this.handleSave.bind(this)}>

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
                               groupId={ project.group.id }
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

            <List ref="tasks"
                  className="ux-list-tasks"
                  items={ tasks }
                  itemEditor={ TaskItemEditor }
                  itemRenderer={ TaskItemRenderer }
                  onItemSelect={ this.handleTaskSelect.bind(this) }
                  onItemUpdate={ this.handleTaskUpdate.bind(this) }/>
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
  graphql(MembersQuery, {
    options: (props) => {
      let { groupId } = props;
      console.assert(groupId);

      return {
        variables: {
          itemId: ID.toGlobalId('Group', groupId)
        }
      };
    },

    props: ({ ownProps, data }) => {
      let { errors, loading, group={} } = data;
      let { members:items } = group;

      return {
        errors,
        loading,
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
        project {
          group {
            id
          }
        }

        tasks {
          ...ItemFragment
          ...TaskFragment
        }
      }
    }
  }

  ${Fragments.ItemFragment}
  ${Fragments.TaskFragment}  
`;

export const TaskCanvas = compose(
  connectReducer(ItemReducer.graphql(TaskQuery))
)(TaskCanvasComponent);
