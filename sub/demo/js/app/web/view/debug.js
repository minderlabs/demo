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

    // TODO(burdon): Change to list (same for select).
    let rows = viewer.items.edges.map((edge) => {
      return (
        <div key={ edge.node.id }>{ edge.node.title }</div>
      );
    });

    let options = Array.from(DATA_TYPE_MAP.keys()).map((type) => {
      return <option key={ type } value={ type }>{ type }</option>
    });

    return (
      <div className="app-debug-view app-column app-expand">

        <div className="app-toolbar">
          <select defaultValue={ this.props.relay.variables.type }
                  onChange={ this.handleTypeChange.bind(this) }>
            { options }
          </select>

          <Picker viewer={ viewer }
                  className="app-expand"
                  type={ this.props.relay.variables.type }
                  onSelect={ this.handleSelectItem.bind(this) }/>
        </div>

        <div className="app-panel app-section">
          { rows }
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
