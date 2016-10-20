//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import UpdateTaskMutation from '../../mutations/update_task';

import './task_detail.less';

/**
 * Task detail view.
 */
class TaskDetail extends React.Component {

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  static propTypes = {
    task: React.PropTypes.object.isRequired
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      task: _.pick(this.props.task, ['title', 'status'])
    }
  }

  handleTextChange(field, event) {
    this.setState({
      task: _.merge(this.state.task, _.set({}, field, event.target.value))
    });
  }

  handleSave(event) {
    let { user, task } = this.props;

    this.props.relay.commitUpdate(
      new UpdateTaskMutation({
        user: user,
        task: task,

        title: this.state.task.title,
        status: this.state.task.status
      })
    );

    this.context.router.goBack();
  }

  handleCancel(event) {
    this.context.router.goBack();
  }

  render() {
    let { task } = this.props;

    return (
      <div className="app-item-detail">
        <input type="text" className="app-expand app-field-title" title={ task.id } autoFocus="autoFocus"
               onChange={ this.handleTextChange.bind(this, 'title') }
               value={ this.state.task.title }/>

        <div className="app-toolbar">
          <button onClick={ this.handleSave.bind(this) }>Save</button>
          <button onClick={ this.handleCancel.bind(this) }>Cancel</button>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(TaskDetail, {

  fragments: {
    task: () => Relay.QL`
      fragment on Task {
        id,
        title,
        status,

        ${UpdateTaskMutation.getFragment('task')}
      }
    `
  }
});
