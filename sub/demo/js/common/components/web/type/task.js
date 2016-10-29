//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import Picker from '../../../../common/components/web/picker';

import './task.less';

/**
 * Task data.
 */
class Task extends React.Component {

  static propTypes = {
    viewer: React.PropTypes.object.isRequired,
    data: React.PropTypes.object.isRequired
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      data: _.cloneDeep(this.props.data)
    };
  }

  handleSelectItem(item) {
    console.log('Selected: %s', JSON.stringify(item));
    this.setState((state, props) => {
      return {
        data: _.defaults(state.data, {
          assignee: item.id
        })
      }
    });
  }

  render() {
    let { viewer } = this.props;
    let { priority, owner, assignee } = this.state.data;

    // TODO(burdon): Mutation (see item_detail). Think about changing to Interface.
    // TODO(burdon): Picker set value (not just text).
    // TODO(burdon): Select box for priority.

    return (
      <div className="app-item-task app-column app-expand">

        <div className="app-section app-expand">
          <div className="app-data app-expand">
            <div className="app-data-row">
              <div className="app-key">Priority</div>
              <div className="app-value">{ priority }</div>
            </div>

            <div className="app-data-row">
              <div className="app-key">Owner</div>
              <div className="app-value">{ owner && owner.title }</div>
            </div>

            <div className="app-data-row">
              <div className="app-key">Assignee</div>
              <div className="app-value">
                <Picker viewer={ viewer }
                        filter={ this.props.relay.variables.filter }
                        value={ assignee && assignee.title }
                        onSelect={ this.handleSelectItem.bind(this) }/>
              </div>
            </div>
          </div>
        </div>

        <div className="app-section app-debug">
          { JSON.stringify(_.pick(this.state.data, ['owner', 'assignee', 'priority']), 0, 1) }
        </div>

      </div>
    );
  }
}

export default Relay.createContainer(Task, {

  // TODO(burdon): How to get User specific fields (since Item)?
  // TODO(burdon): Plugin parse error: https://github.com/jimkyndemeyer/js-graphql-intellij-plugin/issues/36

  initialVariables: {
    filter: {
      type: 'User'
    }
  },

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        ${Picker.getFragment('viewer', { filter: variables.filter })}
      }
    `,

    data: (variables) => Relay.QL`
      fragment on Task {
        priority
        owner {
          id
          title
        }
        assignee {
          id
          title
        }
      }
    `
  }
});
