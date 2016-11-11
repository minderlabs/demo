//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';

import { ACTION } from '../reducers';


/**
 * Search bar.
 */
class Search extends React.Component {

  // TODO(burdon): Factor out cross-module utils.
  static timeout = (delay = 500) => {
    let timeout = null;

    /**
     * Invoke the timeout (optionally immediately).
     */
    return (callback, now=false) => {
      timeout && clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = null;
        callback()
      }, now ? 0 : delay);
    }
  };

  static propTypes = {
    value: React.PropTypes.string,
    onSearch: React.PropTypes.func.isRequired
  };

  // TODO(burdon): Research third-party components (lib?)
  // https://github.com/markerikson/redux-ecosystem-links
  // https://github.com/vakhtang/react-search-bar

  constructor() {
    super(...arguments);

    this.state = {
      value: this.props.value || ''
    };

    this._timer = Search.timeout();
  }

  handleChange(event) {
    this.setState({
      value: $(event.target).val()
    });

    this._timer(() => {
      this.props.onSearch(this.state.value);
    });
  }

  handleSearch(event) {
    this.props.onSearch(this.state.value);
  }

  render() {
    return (
      <div className="app-row">
        <input type="text"
               className="app-expand"
               autoFocus="autoFocus"
               value={ this.state.value }
               onChange={ this.handleChange.bind(this) }/>

        <button onClick={ this.handleSearch.bind(this) }>Search</button>
      </div>
    );
  }
}

// TODO(burdon): Separate Redux bindings from components.

const mapStateToProps = (state, ownProps) => {
  return {
    value: state.minder.search.text
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    onSearch: (value) => {
      dispatch({ type: ACTION.MINDER_SEARCH, value });
    }
  }
};

export default connect(mapStateToProps, mapDispatchToProps)(Search);
