//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import SearchView from '../view/search';

/**
 * App navigation
 */
export class NavBar extends React.Component {

  // TODO(burdon): Show/hide search view? Search "folder" overlay? (in full screen mode).
  // TODO(burdon): Show hide < > arrows (on mobile).
  // TODO(burdon): Current heading/breadcrumbs (in redux store).

  static propTypes = {
    search: React.PropTypes.bool
  };

  static defaultProps = {
    search: true
  };

  render() {
    let { search } = this.props;

    return (
      <div className="ux-navbar">
        { search && <SearchView/> || <div/> }
        <NavButtons/>
      </div>
    );
  }
}

export class NavButtons extends React.Component {

  static contextTypes = {
    navigator: React.PropTypes.object.isRequired,
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
      <div>
        <i className="ux-icon ux-icon-action" onClick={ this.handleBack.bind(this) }>arrow_back</i>
        <i className="ux-icon ux-icon-action" onClick={ this.handleForward.bind(this) }>arrow_forward</i>
      </div>
    );
  }
}
