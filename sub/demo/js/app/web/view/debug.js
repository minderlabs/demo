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

  constructor(props, context) {
    super(props, context);
  }

  handleTypeChange(ev) {
    let type = $(ev.target).val();
    this.props.relay.setVariables({
      type: type
    });
  }

  handleSelectItem(item) {
    console.log('Selected: %s', JSON.stringify(item));
  }

  //
  // Layout.
  //

  render() {
    let { viewer } = this.props;

    let rows = viewer.items.edges.map((edge) => {
      return (
        <tr key={ edge.node.id }>
          <td>{ edge.node.title }</td>
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
            <select defaultValue={ this.props.relay.variables.type }
                    onChange={ this.handleTypeChange.bind(this) }>
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
            <Picker viewer={ viewer }
                    type={ this.props.relay.variables.type }
                    onSelect={ this.handleSelectItem.bind(this) }/>
          </div>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(DebugView, {

  initialVariables: {
    type: 'Task',
    text: ''
  },

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

        ${Picker.getFragment('viewer', { type: variables.type })}
      }
    `,
  }
});
