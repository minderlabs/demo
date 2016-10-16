//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { IndexRedirect, Redirect, Route } from 'react-router';
import { toGlobalId } from 'graphql-relay';

import UserQueries from '../../queries/user';
import ItemQueries from '../../queries/item';

import Path from './path';

import DemoApp from './demo';

import HomeView from './view/home';
import DetailView from './view/detail';

// TODO(burdon): Server-side query for current user (inject user's globalId).
const CURRENT_USER = toGlobalId('User', 'U-1');

/**
 * React Relay Router.
 * https://github.com/ReactTraining/react-router
 * https://github.com/relay-tools/react-router-relay
 */
export default (

  <Route path={ Path.ROOT }
         queries={ UserQueries }
         component={ DemoApp }>

    <IndexRedirect to={ Path.HOME }/>

    <Route path={ Path.HOME }
           queries={ UserQueries }
           prepareParams={ params => ({ ...params, userId: CURRENT_USER }) }
           component={ HomeView }/>

    <Route path={ Path.DETAIL + '/:itemId' }
           queries={ ItemQueries }
           prepareParams={ params => ({ ...params, userId: CURRENT_USER }) }
           component={ DetailView }/>

    <Redirect from='*' to={ Path.HOME }/>
  </Route>

);
