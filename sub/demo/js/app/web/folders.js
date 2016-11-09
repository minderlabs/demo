//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import Path from './path';

/**
 * Sidebar folders.
 */
class Folders extends React.Component {

  static propTypes = {
    onSelect: React.PropTypes.func.isRequired
  };

  handleSelect(folder) {
    this.props.onSelect(folder);
  }

  render() {

    let folders = this.props.viewer.folders.map(folder => {
      return (
        <a key={ folder.data.itemId || folder.data.path }
           className="app-list-item"
           onClick={ this.handleSelect.bind(this, folder) }>{ folder.title }</a>
      );
    });

    return (
      <div>
        <div className="app-list">
          { folders }
        </div>

        <div className="app-list">
          <a className="app-list-item" onClick={ this.handleSelect.bind(this, Path.DEBUG) }>Debug</a>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(Folders, {

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        folders {
          id
          title
            
          data {
            __typename
            ... on Folder {
              itemId
              path
              filter {
                type
              }
            }
          }  
        }
      }
    `,
  }
});
