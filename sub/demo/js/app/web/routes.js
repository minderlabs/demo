//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { IndexRedirect, Redirect, Route } from 'react-router';
import { toGlobalId } from 'graphql-relay';

import UserQueries from '../../common/queries/user';
import ItemQueries from '../../common/queries/item';

import config from './config';
import Path from './path';

import DemoApp from './demo';

import HomeView from './view/home';
import DetailView from './view/detail';

// Set by server.
const currentUser = toGlobalId('User', config.get('userId'));
console.log('Config =', String(config));

// TODO(burdon): Error doing basic query.
// http://localhost:8080/graphql?query=query%20User%20%7B%0A%20%20user(userId%3A%20%22VXNlcjo%3D%22)%20%7B%0A%20%20%20%20id%0A%20%20%20%20title%0A%20%20%7D%0A%7D%0A&operationName=User

/**
 * React Relay Router.
 * https://github.com/ReactTraining/react-router
 * https://github.com/relay-tools/react-router-relay
 * TODO(burdon): Use onReadyStateChange?
 * TODO(burdon): Use Path to configure /detail/:itemId path definition.
 * TODO(burdon): Native?
 */
export default (

  <Route path={ Path.ROOT }
         queries={ UserQueries }
         component={ DemoApp }>

    <IndexRedirect to={ Path.HOME }/>

    <Route path={ Path.HOME }
           queries={ UserQueries }
           prepareParams={ params => ({ ...params, userId: currentUser }) }
           component={ HomeView }/>

    <Route path={ Path.DETAIL + '/:itemId' }
           queries={ ItemQueries }
           prepareParams={ params => ({ ...params, userId: currentUser }) }
           component={ DetailView }/>

    <Redirect from='*' to={ Path.HOME }/>

  </Route>

);
