//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { IndexRedirect, Redirect, Route, Router } from 'react-router'
import { connect } from 'react-redux'
import { ApolloProvider } from 'react-apollo';

import Layout from './view/layout';
import DetailView from './view/detail';
import FolderView from './view/folder';
import TestView from './view/testing';

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
    //

    // TODO(burdon): Move Layout to view.

    return (
      <ApolloProvider client={ this.props.client } store={ this.props.store }>

        <Router history={ this.props.history }>

          <Route pattern={ Path.ROOT } component={ Layout }>

            <IndexRedirect to={ Path.HOME }/>

            <Route path={ Path.TESTING } component={ TestView }/>
            <Route path="app/:folder" component={ FolderView }/>
            <Route path="app/:itemView/:itemId" component={ DetailView }/>

            <Redirect from='*' to={ Path.HOME }/>

          </Route>
        </Router>

      </ApolloProvider>
    );
  }
}

export default connect()(Application);
