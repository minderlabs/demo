//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { IndexRedirect, Redirect, Route } from 'react-router';
import { toGlobalId } from 'graphql-relay';

import { Viewer } from '../../common/data/database';

import config from './config';
import Path from './path';

import DemoApp from './demo';

import DebugView from './view/debug';
import HomeView from './view/home';
import ItemDetailView from './view/detail';

//
// NOTE: Don't remove (needed to trigger webpack on schema changes).
//

import { VERSION } from '../../common/data/schema';


//
// Config JSON variable set by server.
//

const userId = toGlobalId(Viewer.KIND, config.get('userId'));


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


/**
 * React Relay Router.
 *
 * https://github.com/ReactTraining/react-router
 * https://github.com/relay-tools/react-router-relay
 *
 * TODO(burdon): Use onReadyStateChange?
 */
export default (

  <Route path={ Path.ROOT }
         queries={ HomeQueries }
         component={ DemoApp }>

    <IndexRedirect to={ Path.HOME }/>

    <Route path={ Path.HOME }
           queries={ HomeQueries }
           prepareParams={ params => ({ ...params, userId: userId }) }
           component={ HomeView }/>

    <Route path={ Path.DETAIL + '/:itemId' }
           queries={ ItemDetailQueries }
           prepareParams={ params => ({ ...params, userId: userId }) }
           component={ ItemDetailView }/>

    <Route path={ Path.DEBUG }
           queries={ HomeQueries }
           prepareParams={ params => ({ ...params, userId: userId }) }
           component={ DebugView }/>

    <Redirect from='*' to={ Path.HOME }/>

  </Route>

);
