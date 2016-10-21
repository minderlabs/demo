//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

/**
 * A Note.
 */
class Note extends React.Component {

  static propTypes = {
    note: React.PropTypes.object.isRequired
  };

  render() {
    let { note } = this.props;

    return (
      <div>
        <div className="app-expand app-field-title" title={ note.id }>{ note.title }</div>

        {note.content}
      </div>
    );
  }
}

export default Relay.createContainer(Note, {

  fragments: {
    note: () => Relay.QL`
      fragment on Note {
        id
        title
        labels

        content
      }
    `
  }
});
