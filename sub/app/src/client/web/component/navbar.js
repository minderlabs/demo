//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';

import SearchPanel from '../view/search';

/**
 * App navigation
 */
export class Navbar extends React.Component {

  // TODO(burdon): Show/hide search view? Search "folder" overlay? (in full screen mode).
  // TODO(burdon): Show hide < > arrows (on mobile).
  // TODO(burdon): Current heading/breadcrumbs (in redux store).

  static propTypes = {
    search: PropTypes.bool
  };

  static defaultProps = {
    search: true
  };

  static contextTypes = {
    typeRegistry: PropTypes.object.isRequired,
  };

  render() {
    let { children, search } = this.props;

    return (
      <nav className="ux-navbar">
        { search && <SearchPanel/> || <div/> }

        <div className="ux-header ux-expand">
          { children }
        </div>

        <NavButtons/>
      </nav>
    );
  }
}

export class NavButtons extends React.Component {

  static contextTypes = {
    navigator: PropTypes.object.isRequired,
  };

  handleBack() {
    this.context.navigator.goBack();
  }

  handleForward() {
    this.context.navigator.goForward();
  }

  render() {
    return (
      <div className="ux-navbar-buttons">
        <i className="ux-icon ux-icon-action" onClick={ this.handleBack.bind(this) }>arrow_back</i>
        <i className="ux-icon ux-icon-action" onClick={ this.handleForward.bind(this) }>arrow_forward</i>
      </div>
    );
  }
}
