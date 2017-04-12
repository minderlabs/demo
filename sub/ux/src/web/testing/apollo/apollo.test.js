//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { App } from './apollo';

it('Renders without crashing', () => {
  const app = new App();

  // TODO(burdon): Fire async action and listen? Poll for redux/apollo store updates?
  // http://redux.js.org/docs/api/Store.html#subscribe
  // http://redux.js.org/docs/faq/StoreSetup.html#store-setup-subscriptions
  // https://github.com/markerikson/redux-ecosystem-links/blob/master/store.md#store-change-subscriptions
  // https://facebook.github.io/jest/docs/tutorial-async.html#content
  app.store.subscribe(() => {
    console.log('####', app.store.getState()['app']);   // TODO(burdon): Const (move reducer to App)
  });

  ReactDOM.render(app.root, document.createElement('div'));

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
});
