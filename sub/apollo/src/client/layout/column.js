//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'react-apollo';

import { QueryParser } from 'minder-core';
import { SearchBar } from 'minder-ux';

import { SearchList } from '../component/list_factory';

import { ACTION } from '../reducers';

import BaseLayout from './base';

import './column.less';

/**
 * Column layout.
 */
class ColumnLayout extends React.Component {

  handleSearch(text) {
    this.props.onSearch(text);
  }

  handleItemSelect(item) {
    this.refs.search.reset(); // TODO(burdon): dispatch Redux state instead (and remove reference).
    this.props.navigator.pushDetail(item);
  }

  render() {
    let { children, filter, search } = this.props;

    return (
      <BaseLayout className="app-column-layout">

        {/* Search bar (and panel) */}
        <div className="app-search-container">
          <div className="ux-section ux-toolbar">
            <SearchBar ref="search"
                       value={ search.text }
                       onSearch={ this.handleSearch.bind(this) }/>
          </div>

          {/*
            * TODO(burdon): Factor out slide panel.
            * TODO(burdon): Custom renderer (remove favorite property).
            * TODO(burdon): Limit results to 10 items (shorter than other panels.)
            */}
          <div className='app-drop'>
            <div className="app-drop-panel">
              <SearchList favorite={ false }
                          filter={ filter }
                          onItemSelect={ this.handleItemSelect.bind(this) }/>
            </div>
          </div>
        </div>

        { children }

      </BaseLayout>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  let { injector, search } = state.minder;

  // TODO(burdon): Hack: Should depend on whether child supports search filtering.
  // https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
  // NOTE: Search state come from dispatch via SearchBar.
  let queryParser = injector.get(QueryParser);
  let filter = _.isEmpty(ownProps.params.view) ? {} : queryParser.parse(search.text);

  return {
    filter,
    search
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    // Store search state (so can restore value when nav back).
    onSearch: (value) => {
      dispatch({ type: ACTION.SEARCH, value });
    },
  }
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps)
)(ColumnLayout);
