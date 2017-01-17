//
// Copyright 2016 Minder Labs.
//

import React from 'react';

/**
 * App navigation
 */
export class NavBar extends React.Component {

  // TODO(burdon): Current heading/breadcrumbs.
  // TODO(burdon): Move Navigator and this to ux-core/ux-util.

  static contextTypes = {
    navigator: React.PropTypes.object,
  };

  // TODO(burdon): Prevent go back if at top.
  handleBack() {
    this.context.navigator.goBack();
  }

  handleForward() {
    this.context.navigator.goForward();
  }

  render() {
    return (
      <div className="ux-navbar">
        <div>
        </div>
        <div>
          <i className="ux-icon" onClick={ this.handleBack.bind(this) }>arrow_back</i>
          <i className="ux-icon" onClick={ this.handleForward.bind(this) }>arrow_forward</i>
        </div>
      </div>
    );
  }
}
