//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

/**
 * Detail view.
 */
class DetailView extends React.Component {

  constructor(props, context) {
    super(props, context);
  }

  //
  // Layout.
  //

  render() {
    return (
      <div>{ this.props.params.itemId }</div>
    );
  }
}

// TODO(burdon): Define specific fragment (move from DemoApp)?
export default Relay.createContainer(DetailView, {
  fragments: {}
});
