//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'react-apollo';

import { SearchBar } from 'minder-ux';

import { ACTION } from '../reducers';

import './search.less';

/**
 * Wrapper around the searchbar (connected to the Redux model).
 */
class SearchView extends React.Component {

  handleSearch(text) {
    this.props.onSearch(text);
  }

  render() {
    let { search } = this.props;

    return (
      <div className="ux-section ux-toolbar">
        <SearchBar value={ search.text } onSearch={ this.handleSearch.bind(this) }/>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  let { search } = state.minder;

  return {
    search
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    // Store search state (so can restore value when nav back).
    onSearch: (value) => {
      dispatch({
        type: ACTION.SEARCH,
        value
      });
    },
  }
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps)
)(SearchView);
