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

import { AppAction } from './reducers';

import { Path } from './path';

/**
 * Main Application Root component.
 */
export class Application extends React.Component {

  static propTypes = {
    injector: React.PropTypes.object.isRequired,
    client: React.PropTypes.object.isRequired,
    history: React.PropTypes.object.isRequired,
    store: React.PropTypes.object.isRequired
  };

  static childContextTypes = {
    config: React.PropTypes.object,
    injector: React.PropTypes.object,
  };

  getChildContext() {
    return {
      config: this.props.config,
      injector: this.props.injector
    };
  }

  render() {
    let { client, store, history } = this.props;

    // TODO(burdon): onEnter.
    // https://github.com/ReactTraining/react-router/blob/master/docs/API.md#onenternextstate-replace-callback

    return (
      <ApolloProvider client={ client } store={ store }>

        <Router history={ history }>

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

const mapStateToProps = (state, ownProps) => {
  let { config } = AppAction.getState(state);
  return {
    config
  };
};

export default connect(mapStateToProps)(Application);
