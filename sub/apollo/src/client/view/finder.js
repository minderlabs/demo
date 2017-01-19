//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import SearchView from './search';
import FolderView from './folder';

/**
 * Left nav finder.
 */
export default class FinderView extends React.Component {

  render() {
    let { folder } = this.props;

    return (
      <div className="ux-column">
        <SearchView/>
        <FolderView folder={ folder } sub={ 1 }/>
      </div>
    )
  }
}
