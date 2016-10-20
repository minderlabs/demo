//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import UpdateTaskMutation from '../../mutations/update_task';

/**
 * Compact view of a Task.
 */
class Task extends React.Component {

  static propTypes = {
    task: React.PropTypes.object.isRequired
  };

  handleToggleStatus(event) {
    event.stopPropagation();

    let { user, task } = this.props;

    // TODO(burdon): This should add/remove a label.
    this.props.relay.commitUpdate(
      new UpdateTaskMutation({
        user: user,                         // TODO(burdon): Just pass in ID?
        task: task,                         // TODO(burdon): Just pass in ID?
        status: task.status ? 0 : 1         // TODO(burdon): Label.
      })
    );
  }

  render() {
    let { task } = this.props;

    return (
      <div>
        <i className="app-icon app-icon-medium app-icon-star material-icons"
           onClick={ this.handleToggleStatus.bind(this) }>
          { task.status ? 'star': 'star_border' }
        </i>

        <div className="app-expand app-field-title" title={ task.id }>{ task.title }</div>
      </div>
    );
  }
}

export default Relay.createContainer(Task, {

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
