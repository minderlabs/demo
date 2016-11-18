//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

/**
 * Note data.
 */
class Note extends React.Component {

  // TODO(burdon): Base type.
  // TODO(burdon): Factor out textarea.

  static propTypes = {
    viewer: React.PropTypes.object.isRequired,
    data: React.PropTypes.object.isRequired
  };

  constructor() {
    super(...arguments);

    this.state = {
      data: _.cloneDeep(this.props.data)
    };
  }

  get values() {
    return this.state.data;
  }

  handleTextChange(event) {
    let value = event.target.value;

    this.setState((state, props) => {
      return {
        data: _.assign({}, state.data, {
          content: value
        })
      };
    });
  }

  render() {
    return (
      <div className="app-item-note app-section">
        <div className="app-row">
          <textarea className="app-expand"
                    rows="5"
                    value={ this.state.data.content || '' }
                    onChange={ this.handleTextChange.bind(this) }/>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(Note, {

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id
      }
    `,

    data: (variables) => Relay.QL`
      fragment on Note {
        content
      }
    `
  }
});
