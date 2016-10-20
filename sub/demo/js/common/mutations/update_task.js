//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import Relay from 'react-relay';

import { Util } from '../util/util';

/**
 * Updates an existing item.
 */
export default class UpdateTaskMutation extends Relay.Mutation {

  // TODO(burdon): Generalize fields.
  // TODO(burdon): How to add/remove from array (e.g., labels).

  static fragments = {
    task: () => Relay.QL`
      fragment on Task {
        id
      }
    `
  };

  getMutation() {
    // Corresponds to schema mutation type.
    return Relay.QL`mutation { updateTaskMutation }`;
  }

  getVariables() {
    return {
      userId: this.props.user.id,
      taskId: this.props.task.id,

      title:  this.props.title,
      status: this.props.status
    };
  }

  getFatQuery() {
    return Relay.QL`
      fragment on UpdateTaskMutationPayload {
        task {
          title,
          status
        }
      }
    `;
  }

  getConfigs() {
    // https://facebook.github.io/relay/docs/guides-mutations.html#fields-change
    return [{
      type: 'FIELDS_CHANGE',
      fieldIDs: {
        task: this.props.task.id
      }
    }];
  }

  getOptimisticResponse() {
    let task = {
      id: this.props.task.id,
    };

    Util.maybeUpdateItem(task, this.props, 'title');
    Util.maybeUpdateItem(task, this.props, 'status');

    return {
      task: task
    };
  }
}
