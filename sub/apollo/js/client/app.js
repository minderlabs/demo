//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { BrowserRouter, Match } from 'react-router';
import { ApolloProvider } from 'react-apollo';

import Layout from './component/layout';

/**
 * Main Application Root component.
 */
export default class Application extends React.Component {

  static childContextTypes = {
    devtools: React.PropTypes.func
  };

  static propTypes = {
    config: React.PropTypes.object.isRequired,
    client: React.PropTypes.object.isRequired,
    store:  React.PropTypes.object.isRequired
  };

  getChildContext() {
    return {
      devtools: this.props.devtools
    }
  }

  render() {

    //
    // Apollo + Router (v4)
    // NOTE: Router Mmust use declarative component (not render) otherwise squashes router properties.
    // https://react-router.now.sh/quick-start
    // https://github.com/ReactTraining/react-router/tree/v4
    //

    return (
      <ApolloProvider client={ this.props.client } store={ this.props.store }>
        <BrowserRouter>
          <Match pattern="/" component={ Layout }/>
        </BrowserRouter>
      </ApolloProvider>
    );
  }
}
