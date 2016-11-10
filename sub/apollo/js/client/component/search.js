//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';


/**
 * Search bar.
 */
export default class Search extends React.Component {

  // TODO(burdon): How to update redux? With Apollo?
  // http://redux.js.org/docs/basics/UsageWithReact.html

  // TODO(burdon): Research third-party components (lib?)
  // https://github.com/vakhtang/react-search-bar

  handleSearch() {

  }

  render() {
    return (
      <div className="app-row">
        <input type="text" autoFocus="autoFocus"/>
        <button onClick={ this.handleSearch.bind(this) }>Search</button>
      </div>
    );
  }
}
