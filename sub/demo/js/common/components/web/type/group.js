//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

/**
 * Note data.
 */
class Group extends React.Component {

  // TODO(burdon): Base type.
  // TODO(burdon): Factor out textarea.

  static propTypes = {
    viewer: React.PropTypes.object.isRequired,
    data: React.PropTypes.object.isRequired
  };

  constructor() {
    super(...arguments);

    this.state = {
      data: _.cloneDeep(this.props.data)
    };
  }

  get values() {
    return this.state.data;
  }

  render() {
    let members = this.props.data.members.map(member => {
      return (
        <div key={ member.id }>{ member.title }</div>
      );
    });

    return (
      <div className="app-section">
        <h3>Members</h3>
        <div>
          { members }
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(Group, {

  // TODO(burdon): Get tasks for each user.

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id
      }
    `,

    data: (variables) => Relay.QL`
      fragment on Group {
        members {
          id
          title
        }
      }
    `
  }
});
