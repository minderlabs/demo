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

  static contextTypes = {
    router: React.PropTypes.object
  };

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

  handleNav(member) {
  }

  handleAddTask(member) {

    // TODO(burdon): Relay can't handle local state (to satisfy fragments).
    // https://github.com/facebook/relay/issues/114
    // https://github.com/facebook/relay/issues/106 (=> Use Flux for local state)

    // TODO(burdon): Options:
    // Patch and wait for Relay 2: https://facebook.github.io/react/blog/2016/08/05/relay-state-of-the-state.html
    // Middleware: https://github.com/nodkz/react-relay-network-layer
    // - https://github.com/facebook/relay/issues/114 (Dec 28 @josephsavona)
    // Redux (liable to be replaced by Relay 2?)
    // - https://github.com/reactjs/redux/issues/464
    // - https://github.com/reactjs/redux/issues/775
    // Apollo (Relay promises mobile first).
    // - https://github.com/apollostack/apollo-client/pull/7/files?short_path=83772ba
    // - OFFLINE: https://github.com/apollostack/apollo-client/issues/424

    // TODO(burdon): Create path (no fragment). Need to cache object in state (redux like)?
    console.log(member);
    this.context.router.push('/create');  // TODO(burdon): Handler.
  }

  render() {

    // TODO(burdon): Nav link from user.
    let members = this.props.data.members.map(member => {
      let tasks = member.items.map(task => {
        return (
          <div key={ member.id + '/' + task.id } className="app-row app-item-task">
            <i className="material-icons">done</i>
            <div>{ task.title }</div>
          </div>
        );
      });

      return (
        <div key={ member.id }>
          <div className="app-row">
            <i className="material-icons" onClick={ this.handleNav.bind(this, member) }>person</i>
            <h3 className="app-expand">{ member.title }</h3>
            <i className="material-icons" onClick={ this.handleAddTask.bind(this, member) }>add</i>
          </div>
          <div>
            { tasks }
          </div>
        </div>
      );
    });

    return (
      <div className="app-item-group app-section">
        <div className="app-agenda">
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
