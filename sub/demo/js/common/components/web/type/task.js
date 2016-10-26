//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

/**
 * Task data.
 */
class Task extends React.Component {

  static propTypes = {
    data: React.PropTypes.object.isRequired
  };

  render() {
    let { owner, assignee, priority } = this.props.data;

    return (
      <div className="app-section">
        <table>
          <tbody>
            <tr>
              <td>Owner</td>
              <td>{ owner }</td>
            </tr>
            <tr>
              <td>Assignee</td>
              <td>{ assignee }</td>
            </tr>
            <tr>
              <td>Priority</td>
              <td>{ priority }</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

export default Relay.createContainer(Task, {

  fragments: {
    data: () => Relay.QL`
      fragment on Task {
        priority
      }
    `
  }
});
