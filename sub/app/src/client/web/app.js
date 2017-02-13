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
    injector: React.PropTypes.object
  };

  getChildContext() {
    let { config, injector } = this.props;
    return {
      config,
      injector
    };
  }

  /**
   * Render top-level application routes.
   * Activities are top-level components that set-up the context.
   *
   * <Route>
   *   <Activity>                 HOC providing context (injector, navigator, etc.)
   *     <View/>                  Components.
   *   </Activity>
   * <Route>
   */
  render() {
    let { client, store, history } = this.props;

    // https://github.com/ReactTraining/react-router
    // TODO(burdon): onEnter/onLeave

    return (
      <ApolloProvider client={ client } store={ store }>

        <Router history={ history }>

          <Route path={ Path.ROOT }>
            <IndexRedirect to={ Path.HOME }/>

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

const mapStateToProps = (state, ownProps) => {
  let { config } = AppAction.getState(state);
  return {
    config
  };
};

export default connect(mapStateToProps)(Application);
