//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

/**
 * Note data.
 */
class Note extends React.Component {

  static propTypes = {
    data: React.PropTypes.object.isRequired
  };

  render() {
    let { content } = this.props.data;

    return (
      <div className="">
        <h3>Content</h3>
        <div>{ content }</div>
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
