//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { ApolloProvider } from 'react-apollo';

import SidebarPanel from './test_panel';

/**
 * Test root application.
 */
export class TestApplication extends React.Component {

  static propTypes = {
    injector: React.PropTypes.object.isRequired,
    client: React.PropTypes.object.isRequired,
    history: React.PropTypes.object.isRequired,
    store: React.PropTypes.object.isRequired
  };

  static childContextTypes = {
    injector: React.PropTypes.object,
  };

  getChildContext() {
    return {
      injector: this.props.injector
    };
  }

  render() {
    let { client, store } = this.props;

    return (
      <ApolloProvider client={ client } store={ store }>
        <SidebarPanel/>
      </ApolloProvider>
    );
  }
}
