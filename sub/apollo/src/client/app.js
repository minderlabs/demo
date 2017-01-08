//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { IndexRedirect, Redirect, Route, Router } from 'react-router'
import { connect } from 'react-redux'
import { ApolloProvider } from 'react-apollo';

import CanvasActivity from './activity/canvas';
import FinderActivity from './activity/finder';
import TestingActivity from './activity/testing';

import { Path } from './path';

/**
 * Main Application Root component.
 */
export class Application extends React.Component {

  static childContextTypes = {
    injector: React.PropTypes.object,
  };

  static propTypes = {
    injector: React.PropTypes.object.isRequired,
    client: React.PropTypes.object.isRequired,
    history: React.PropTypes.object.isRequired,
    store: React.PropTypes.object.isRequired
  };

  getChildContext() {
    return {
      injector: this.props.injector
    };
  }

  render() {

    //
    // Redux Router.
    // https://github.com/reactjs/react-router-redux
    // TODO(burdon): Distinguish form factor (e.g., column) from canvas (e.g., board).
    //
    // [App]==(Route)==>[Activity]o--[Layout]o--[View]
    //
    // App's route determines the activity.
    // The form-factor (e.g., mobile, web, CRX) determines the layout.
    // The acitivity creates (multiple) views (analogous to Android fragments) for the given layout.
    //

    return (
      <ApolloProvider client={ this.props.client } store={ this.props.store }>

        <Router history={ this.props.history }>

          <Route path={ Path.ROOT }>
            <IndexRedirect to={ Path.HOME }/>

            <Route path={ Path.TESTING } component={ TestingActivity }/>

            {/* E.g., /app/inbox, /app/favorites?selected=xxx */}
            <Route path={ Path.route(['folder']) } component={ FinderActivity }/>

            {/* E.g., /app/card/xxx, /app/board/xxx */}
            <Route path={ Path.route(['canvas', 'itemId']) } component={ CanvasActivity }/>

            <Redirect from='*' to={ Path.HOME }/>
          </Route>

        </Router>

      </ApolloProvider>
    );
  }
}

export default connect()(Application);
