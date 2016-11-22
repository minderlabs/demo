//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { IndexRedirect, Redirect, Route, Router } from 'react-router'
import { connect } from 'react-redux'
import { ApolloProvider } from 'react-apollo';

import Layout from './view/layout';
import DetailView from './view/detail';
import FolderView from './view/folder';

import { Path } from './path';

/**
 * Main Application Root component.
 */
class Application extends React.Component {

  static propTypes = {
    client: React.PropTypes.object.isRequired,
    history: React.PropTypes.object.isRequired,
    store: React.PropTypes.object.isRequired
  };

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

            <Route path=":folder" component={ FolderView }/>
            <Route path=":itemView/:itemId" component={ DetailView }/>

            <Redirect from='*' to={ Path.HOME }/>

          </Route>
        </Router>

      </ApolloProvider>
    );
  }
}

export default connect()(Application);