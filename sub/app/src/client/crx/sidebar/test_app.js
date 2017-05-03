//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { ApolloProvider } from 'react-apollo';
import PropTypes from 'prop-types';

import SidebarPanel from './test_panel';

/**
 * Test root application.
 */
export class TestApplication extends React.Component {

  static propTypes = {
    injector: PropTypes.object.isRequired,
    client: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    store: PropTypes.object.isRequired
  };

  static childContextTypes = {
    injector: PropTypes.object,
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
