//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { IndexRedirect, Redirect, Route, Router } from 'react-router'
import { connect } from 'react-redux'
import { ApolloProvider } from 'react-apollo';

import { Path } from '../../web/path';
import CanvasActivity from '../../web/activity/canvas';
import FinderActivity from '../../web/activity/finder';
import TestingActivity from '../../web/activity/testing';

import { AppAction } from '../../web/reducers';

/**
 * Main Application Root component.
 */
class Application extends React.Component {

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

    return (
      <ApolloProvider client={ client } store={ store }>

        <Router history={ history }>

          <Route path={ Path.ROOT }>
            <IndexRedirect to={ Path.HOME }/>

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
