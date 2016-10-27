//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import { DATA_TYPE_MAP } from '../../../common/data/schema';

/**
 * Debug view.
 */
class DebugView extends React.Component {

  static propTypes = {
    viewer: React.PropTypes.object.isRequired,
  };

  handleTypeChange(ev) {
    let type = $(ev.target).val();
    this.props.relay.setVariables({
      type: type
    })
  }

  //
  // Layout.
  //

  render() {
    let { viewer } = this.props;

    let items = viewer.items.edges.map((item) => {
      return (
        <tr key={ item.node.id }>
          <td>{ item.node.title }</td>
        </tr>
      );
    });

    let options = Array.from(DATA_TYPE_MAP.keys()).map((type) => {
      return <option key={ type } value={ type }>{ type }</option>
    });

    return (
      <div className="app-panel-column">
        <div className="app-section">
          <h1>Debug</h1>
        </div>

        <div className="app-section app-toolbar">
          <h2 className="app-expand">Items</h2>
          <select defaultValue="Note" onChange={ this.handleTypeChange.bind(this) }>
            { options }
          </select>
        </div>

        <div className="app-section">
          <table>
            <tbody>{ items }</tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(DebugView, {

  initialVariables: {
    type: 'Note'
  },

  fragments: {
    viewer: () => Relay.QL`
      fragment on Viewer {
        id
        
        user {
          title
        }
        
        items(first: 10, type: $type) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `,
  }
});
