//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import {render} from 'react-dom';

/**
 * Main App.
 */
class App extends React.Component {
  render () {
    return <p> Hello React!</p>;
  }
}

render(<App/>, document.getElementById('app-container'));
