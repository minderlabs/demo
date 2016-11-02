//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';
import useRelay from 'react-router-relay';
import { IndexRedirect, Redirect, Route, Router } from 'react-router';
import { applyRouterMiddleware, browserHistory } from 'react-router';
import { toGlobalId } from 'graphql-relay';

import { Viewer } from '../../common/data/database';

import Path from './path';
import Layout from './layout';

import DebugView from './view/debug';
import HomeView from './view/home';
import ItemDetailView from './view/detail';


//
// Router queries.
// NOTE: These must match the fragments declared in the router components.
//

const HomeQueries = {

  viewer: () => Relay.QL`
    query {
      viewer(userId: $userId)
    }
  `

};

const ItemDetailQueries = {

  viewer: () => Relay.QL`
    query {
      viewer(userId: $userId)
    }
  `,

  item: () => Relay.QL`
    query {
      item(itemId: $itemId)
    }
  `

};


//
// Routes.
// TODO(burdon): Factor out routes?
//

const Routes = (config) => {

  // From global config (set-up by server).
  const userId = toGlobalId(Viewer.KIND, config.get('userId'));

  return (
    <Route path={ Path.ROOT }
           queries={ HomeQueries }
           component={ Layout }>

      <IndexRedirect to={ Path.HOME }/>

      <Route path={ Path.DEBUG }
             queries={ HomeQueries }
             prepareParams={ params => ({...params, userId: userId}) }
             component={ DebugView }/>

      <Route path={ Path.ROOT + ':folder' }
             queries={ HomeQueries }
             prepareParams={ params => ({...params, userId: userId}) }
             component={ HomeView }/>

      <Route path={ Path.DETAIL + '/:itemId' }
             queries={ ItemDetailQueries }
             prepareParams={ params => ({...params, userId: userId}) }
             component={ ItemDetailView }/>

      <Redirect from='*' to={ Path.HOME }/>

    </Route>
  );
};

/**
 * React Relay Router.
 *
 * https://github.com/ReactTraining/react-router
 * https://github.com/relay-tools/react-router-relay
 * https://facebook.github.io/relay/docs/api-reference-relay-renderer.html#content
 */
export default class Application extends React.Component {

  // Make error handler available to nested components.
  static childContextTypes = {
    errorHandler: React.PropTypes.object
  };

  getChildContext() {
    return {
      errorHandler: this.props.errorHandler
    }
  }

  handleReadyStateChange(readyState) {
    if (readyState.error) {
      // TODO(burdon): Call error handler.
      console.error(readyState.error);

      // Use form to redirect to server error page (i.e., POST with error values).
      if (this.props.config.get('redirectOnError')) {
        setTimeout(() => {
          let errorForm = $('#app-error');
          errorForm.find('input').val(readyState.error);
          errorForm.submit();
        }, 1000);
      }
    } else if (readyState.ready) {
      console.log('State changed:', _.map(readyState.events, (event) => event.type).join(' => '));
    }
  }

  render() {
    return (
      <Router
        routes={ Routes(this.props.config) }
        render={ applyRouterMiddleware(useRelay) }
        history={ browserHistory }
        environment={ Relay.Store }
        onReadyStateChange={ this.handleReadyStateChange.bind(this) }
      />
    );
  }
}
