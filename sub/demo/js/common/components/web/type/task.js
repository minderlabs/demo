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
    let { priority } = this.props.data;

    return (
      <div className="app-section">
        <h3>Priority</h3>
        <div>{ priority }</div>
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
