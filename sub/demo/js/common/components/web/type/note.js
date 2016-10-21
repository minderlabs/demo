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

  handleToggleStatus(event) {
    event.stopPropagation();

    // TODO(burdon): Rename note=>item (standardize).
    let { user, note } = this.props;

    // TODO(madadam): Add mutations.
    // TODO(burdon): This should add/remove a label.
    /*
    this.props.relay.commitUpdate(
      new UpdateItemMutation({
        user: user,                         // TODO(burdon): Just pass in ID?
        item: item,                         // TODO(burdon): Just pass in ID?
        status: item.status ? 0 : 1         // TODO(burdon): Label.
      })
    );
    */
  }

  render() {
    let { note } = this.props;

    return (
      <div>
        <i className="app-icon app-icon-medium app-icon-star material-icons"
           onClick={ this.handleToggleStatus.bind(this) }>
          { note.status ? 'star': 'star_border' }
        </i>

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
        status

        content
      }
    `
  }
});
