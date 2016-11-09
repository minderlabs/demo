//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';
import { fromGlobalId } from 'graphql-relay';

import './group.less';

/**
 * Note data.
 */
class Group extends React.Component {

  // TODO(burdon): Base type.

  static contextTypes = {
    router: React.PropTypes.object,
    itemCreator: React.PropTypes.func,
    itemSelector: React.PropTypes.func
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

  handleMemberSelect(member) {
    this.context.itemSelector(member);
  }

  handleTaskSelect(task) {
    this.context.itemSelector(task);
  }

  handleTaskAdd(member) {
    this.context.itemCreator({
      type: 'Task',
      data: {
        owner: fromGlobalId(this.props.viewer.id).id,
        assignee: fromGlobalId(member.id).id
      }
    });
  }

  render() {

    // TODO(burdon): Nav link from user.
    let members = this.props.data.members.map(member => {
      let tasks = member.items.map(task => {
        return (
          <div key={ member.id + '/' + task.id } className="app-row app-item-task">
            <i className="material-icons"
               onClick={ this.handleTaskSelect.bind(this, task) }>assignment_turned_in</i>
            <div>{ task.title }</div>
          </div>
        );
      });

      return (
        <div key={ member.id }>
          <div className="app-row">
            <i className="material-icons"
               onClick={ this.handleMemberSelect.bind(this, member) }>person</i>
            <h3 className="app-expand">{ member.title }</h3>
            <i className="material-icons"
               onClick={ this.handleTaskAdd.bind(this, member) }>add</i>
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


  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id
      }
    `,

    // TODO(burdon): How to configure filter -- e.g., to "assigned".
    // TODO(burdon): What if multiple sets of items (e.g., ownedBy assignedTo?) Prefix label?

    data: (variables) => Relay.QL`
      fragment on Group {
        members {
          id
          title

          items(filter: { type: "Task" }) {
            id
            title
          }
        }
      }
    `
  }
});
