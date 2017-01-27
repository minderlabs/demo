//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { IndexRedirect, Redirect, Route, Router } from 'react-router'
import { connect } from 'react-redux'
import { ApolloProvider } from 'react-apollo';

import CanvasActivity from '../../web/activity/canvas';
import FinderActivity from '../../web/activity/finder';
import TestingActivity from '../../web/activity/testing';


class Path {
  static ROOT     = '/page';
  static HOME     = '/page/sidebar.html(?**)';
  static FINDER   = '/page/sidebar.html(?**)';
  static TESTING  = '/page/sidebar.html(?**)';
}

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
    injector: React.PropTypes.object,
  };

  getChildContext() {
    return {
      injector: this.props.injector
    };
  }

  render() {
    let { client, store, history } = this.props;

    // TODO(burdon): Don't use browser history (since path can't change).

    return (
      <ApolloProvider client={ client } store={ store }>

        <Router history={ history }>

          <Route path={ Path.ROOT }>
            <IndexRedirect to={ Path.HOME }/>

            <Route path={ Path.HOME } component={ FinderActivity }/>

            <Redirect from='*' to={ Path.HOME }/>
          </Route>

        </Router>

      </ApolloProvider>
    );
  }
}

// const mapStateToProps = (state, ownProps) => {
//   console.log('!!!!!!!!!!!!!!!!!!!!!!!', state);
// };

export default connect()(Application);
