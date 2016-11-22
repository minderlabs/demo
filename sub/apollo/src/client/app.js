//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { Router, Route } from 'react-router'
import { connect } from 'react-redux'
import { ApolloProvider } from 'react-apollo';

import Layout from './layout';
import DetailView from './view/detail';
import FolderView from './view/folder';

/**
 * Main Application Root component.
 */
class Application extends React.Component {

  static childContextTypes = {
    queryRegistry: React.PropTypes.object
  };

  static propTypes = {
    config:   React.PropTypes.object.isRequired,
    history:  React.PropTypes.object.isRequired,
    client:   React.PropTypes.object.isRequired,
    store:    React.PropTypes.object.isRequired
  };

  getChildContext() {
    return {
      queryRegistry: this.props.queryRegistry,
    }
  }

  render() {

    //
    // Redux Router.
    // https://github.com/reactjs/react-router-redux
    //

    // TODO(burdon): Factor out routes.
    // TODO(burdon): Move Layout to view.

    return (
      <ApolloProvider client={ this.props.client }
                      store={ this.props.store }>

        <Router history={ this.props.history }>

          <Route pattern="/" component={ Layout }>

            <Route path=":folder" component={ FolderView }/>
            <Route path=":itemView/:itemId" component={ DetailView }/>

          </Route>
        </Router>

      </ApolloProvider>
    );
  }
}

export default connect()(Application);
