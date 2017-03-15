//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'react-apollo';

import { SearchBar } from 'minder-ux';

import { AppAction } from '../../common/reducers';

import './search.less';

/**
 * Wrapper around the searchbar (connected to the Redux store).
 */
class SearchPanel extends React.Component {

  handleSearch(text) {
    this.props.onSearch(text);
  }

  render() {
    let { search } = this.props;

    return (
      <div className="app-search-toolbar">
        <SearchBar className="ux-expand" value={ search.text } onSearch={ this.handleSearch.bind(this) }/>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  let { search } = AppAction.getState(state);

  return {
    search
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    // Store search state (so can restore value when nav back).
    onSearch: (text) => {
      dispatch(AppAction.search(text));
    }
  }
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps)
)(SearchPanel);
