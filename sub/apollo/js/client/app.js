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

  //
  // Apollo + Router (v4)
  // http://dev.apollodata.com/react
  // https://github.com/ReactTraining/react-router/tree/v4
  // https://react-router.now.sh/quick-start
  //

  static propTypes = {
    config: React.PropTypes.object.isRequired,
    client: React.PropTypes.object.isRequired,
    store:  React.PropTypes.object.isRequired
  };

  render() {

    // NOTE: Router Mmust use declarative component (not render) otherwise squashes router properties.

    return (
      <ApolloProvider client={ this.props.client } store={ this.props.store }>
        <BrowserRouter>
          <Match pattern="/" component={ Layout }/>
        </BrowserRouter>
      </ApolloProvider>
    );
  }
}
