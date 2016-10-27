//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import Picker from '../../../common/components/web/picker';

import { DATA_TYPE_MAP } from '../../../common/data/schema';

import './debug.less';

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

  handleSelectItem(itemId) {
    console.log('Selected: %s', itemId);
  }

  //
  // Layout.
  //

  render() {
    let { viewer } = this.props;

    let rows = viewer.items.edges.map((item) => {
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
      <div className="app-debug-view app-panel-column">
        <div className="app-section">
          <h1>Debug</h1>
        </div>

        <div>
          <h3 className="app-section-header">Items</h3>
          <div className="app-toolbar">
            <select defaultValue="Note" onChange={ this.handleTypeChange.bind(this) }>
              { options }
            </select>
          </div>

          <div className="app-section">
            <table>
              <tbody>{ rows }</tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="app-section-header">Picker</h3>
          <div className="app-toolbar">
            <Picker viewer={ viewer } type="Task" onSelect={ this.handleSelectItem.bind(this) }/>
          </div>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(DebugView, {

  initialVariables: {
    type: 'Note'
  },

  // TODO(burdon): Child fragment variables collide with vars here?
  // http://facebook.github.io/graphql/#sec-Field-Alias
  // https://github.com/facebook/graphql/issues/137
  // https://github.com/facebook/relay/issues/309

  // TODO(burdon): Variable substitution.
  // , { type: 'Task' }

  fragments: {
    viewer: (variables) => Relay.QL`
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

        ${Picker.getFragment('viewer', { type: 'Task' })}
      }
    `,
  }
});
