//
// Copyright 2016 Minder Labs.
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

  handleTypeChange(event) {
    let type = $(event.target).val();
    this.props.relay.setVariables({
      filter: {
        type: type
      },
      pickerFilter: {
        type: type
      }
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
          <select defaultValue={ this.props.relay.variables.filter.type }
                  onChange={ this.handleTypeChange.bind(this) }>
            { options }
          </select>

          <Picker viewer={ viewer }
                  filter={ this.props.relay.variables.pickerFilter }
                  onSelect={ this.handleSelectItem.bind(this) }/>
        </div>

        <div className="app-panel app-section">
          { rows }
        </div>

      </div>
    );
  }
}

const DEFAULT_TYPE = 'Task';

export default Relay.createContainer(DebugView, {

  // NOTE: Different filters since picker adds "matchText" predicate.
  // TODO(burdon): Is it a bug that if the picker does this modification this component must care?

  initialVariables: {
    filter: {
      type: DEFAULT_TYPE
    },
    pickerFilter: {
      type: DEFAULT_TYPE
    }
  },

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id
        
        user {
          title
        }
        
        items(first: 10, filter: $filter) {
          edges {
            node {
              id
              title
            }
          }
        }

       ${Picker.getFragment('viewer', { filter: variables.pickerFilter })}
      }
    `,
  }
});
