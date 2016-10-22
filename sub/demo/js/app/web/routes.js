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
import ItemDetailView from './view/detail';


//
// Config JSON variable set by server.
//

console.log('Config =', String(config));
const currentUser = toGlobalId('User', config.get('userId'));


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
           component={ ItemDetailView }/>

    <Redirect from='*' to={ Path.HOME }/>

  </Route>

);
