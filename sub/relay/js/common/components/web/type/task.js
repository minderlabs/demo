//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import {
  fromGlobalId
} from 'graphql-relay';

import Picker from '../../../../common/components/web/picker';

import './task.less';

/**
 * Task data.
 */
class Task extends React.Component {

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
    let { priority, owner, assignee, details } = this.state.data;

    return {
      priority: priority,
      owner: owner && fromGlobalId(owner.id).id,
      assignee: assignee && fromGlobalId(assignee.id).id,
      details: details
    };
  }

  handleSelectItem(item) {
    this.setState((state, props) => {
      return {
        data: _.assign({}, state.data, {
          assignee: item
        })
      }
    });
  }

  handleTextChange(event) {
    let value = event.target.value;

    this.setState((state, props) => {
      return {
        data: _.assign({}, state.data, {
          details: value
        })
      };
    });
  }

  render() {
    let { viewer } = this.props;
    let { priority, owner, assignee, details } = this.state.data;

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

            <div className="app-data-row app-details">
              <div className="app-key">Details</div>
              <div className="app-value app-row app-expand">
                <textarea className="app-textarea app-expand"
                          rows="5"
                          value={ this.state.data.details || '' }
                          onChange={ this.handleTextChange.bind(this) }/>
              </div>
            </div>

          </div>
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
        details
      }
    `
  }
});
