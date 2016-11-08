//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import './group.less';

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

    // TODO(burdon): Add button per user.

    let members = this.props.data.members.map(member => {
      let tasks = member.items.map(task => {
        return (
          <div key={ member.id + '/' + task.id }>{ task.title }</div>
        );
      });

      return (
        <div key={ member.id }>
          <h2>{ member.title }</h2>
          <div>
            { tasks }
          </div>
        </div>
      );
    });

    return (
      <div className="app-item-group app-section">
        <div>
          { members }
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(Group, {

  // TODO(burdon): Change filter to "assigned".
  // TODO(burdon): What if multiple sets of items? Prefix label?

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

          items(filter: { type: "Task"}) {
            id
            title
          }
        }
      }
    `
  }
});
