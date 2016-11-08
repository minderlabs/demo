//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';
import { IndexRedirect, Redirect, Route } from 'react-router';
import { toGlobalId } from 'graphql-relay';

import { Viewer } from '../../common/data/database';

import Path from './path';
import Layout from './layout';

import DebugView from './view/debug';
import HomeView from './view/home';
import ItemCreateView from './view/create';
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
             prepareParams={ params => ({ ...params, userId: userId }) }
             component={ DebugView }/>

      <Route path={ Path.CREATE }
             queries={ HomeQueries }
             prepareParams={ params => ({ ...params, userId: userId }) }
             component={ ItemCreateView }/>

      <Route path={ Path.DETAIL + '/:itemId' }
             queries={ ItemDetailQueries }
             prepareParams={ params => ({ ...params, userId: userId }) }
             component={ ItemDetailView }/>

      <Route path={ Path.ROOT + ':folder' }
             queries={ HomeQueries }
             prepareParams={ params => ({ ...params, userId: userId }) }
             component={ HomeView }/>

      <Redirect from='*' to={ Path.HOME }/>

    </Route>
  );
};

export default Routes;
