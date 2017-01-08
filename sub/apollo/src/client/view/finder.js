//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import SearchView from './search';
import FolderView from './folder';

/**
 *
 */
export default class FinderView extends React.Component {

  render() {
    let { folder } = this.props;

    return (
      <div className="ux-column">
        <SearchView/>
        <FolderView folder={ folder }/>
      </div>
    )
  }
}
