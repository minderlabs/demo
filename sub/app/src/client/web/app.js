//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { IndexRedirect, Redirect, Route, Router } from 'react-router'
import { ApolloProvider } from 'react-apollo';

import { Path } from '../common/path';

import AdminActivity from './activity/admin';
import CanvasActivity from './activity/canvas';
import FinderActivity from './activity/finder';
import TestingActivity from './activity/testing';

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

    // https://github.com/ReactTraining/react-router
    // TODO(burdon): onEnter/onLeave

    return (
      <ApolloProvider client={ client } store={ store }>

        <Router history={ history }>

          <Route path={ Path.ROOT }>
            <IndexRedirect to={ Path.HOME }/>

            <Route path={ Path.ADMIN } component={ AdminActivity }/>
            <Route path={ Path.TESTING } component={ TestingActivity }/>

            {/*
              * /inbox
              * /favorites
              */}
            <Route path={ Path.route(['folder']) } component={ FinderActivity }/>

            {/*
              * /project/xxx
              * /project/board/xxx
              */}
            <Route path={ Path.route(['type', 'itemId']) } component={ CanvasActivity }/>
            <Route path={ Path.route(['type', 'canvas', 'itemId']) } component={ CanvasActivity }/>

            <Redirect from='*' to={ Path.HOME }/>
          </Route>

        </Router>

      </ApolloProvider>
    );
  }
}
