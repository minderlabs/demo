//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { IndexRedirect, Redirect, Route, Router } from 'react-router'
import { ApolloProvider } from 'react-apollo';

import { Path } from '../../common/path';

import FinderActivity from '../../web/activity/finder';

/**
 * The Application must be a pure React component since HOCs may cause the component to be re-rendered,
 * which would trigger a Router warning.
 *
 * Activities are top-level components that set-up the context.
 */
export class Application extends React.Component {

  static propTypes = {
    injector: React.PropTypes.object.isRequired,
    client: React.PropTypes.object.isRequired,
    history: React.PropTypes.object.isRequired,
    store: React.PropTypes.object.isRequired
  };

  render() {
    let { client, store, history } = this.props;

    return (
      <ApolloProvider client={ client } store={ store }>

        <Router history={ history }>

          <Route path={ Path.ROOT }>
            <IndexRedirect to={ Path.HOME }/>

            <Route path={ Path.route(['folder']) } component={ FinderActivity }/>

            <Redirect from='*' to={ Path.HOME }/>
          </Route>

        </Router>

      </ApolloProvider>
    );
  }
}
