//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import TaskDetail from '../../../common/components/web/task_detail';

import Path from '../path';

/**
 * Item Detail view.
 */
class ItemDetailView extends React.Component {

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  //
  // Layout.
  //

  render() {
    let { user, item } = this.props;

    // Redirect to home page if not found.
    // TODO(burdon): Remove from history stack.
    if (!item) {
      this.context.router.push(Path.HOME);
    }

    return (
      // TODO(madadam): Switch on type, add NoteDetail.
      <div className="app-panel-column">
        <div className="app-section app-debug">{ this.props.params.itemId }</div>

        <div className="app-section">
          <TaskDetail user={ user } task={ item }/>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(ItemDetailView, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        id,
      }
    `,

    item: () => Relay.QL`
      fragment on ItemInterface {
        id,
        type,

        ... on Task {
          ${TaskDetail.getFragment('task')}
        }
      }
    `,
  }
});
