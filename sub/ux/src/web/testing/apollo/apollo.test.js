//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { MutationUtil } from 'minder-core';

import { ID, App, AppState, AppTestAction, TestMutation, TestQuery } from './apollo';

it('Renders without crashing', () => {
  const app = new App();

  // Get Redux store updates.
  // http://redux.js.org/docs/api/Store.html#subscribe
  // http://redux.js.org/docs/faq/StoreSetup.html#store-setup-subscriptions
  // https://facebook.github.io/jest/docs/tutorial-async.html#content
  // https://github.com/markerikson/redux-ecosystem-links/blob/master/store.md#store-change-subscriptions
  app.store.subscribe(() => {
    console.log('[[ UPDATE ]]', JSON.stringify(AppState(app.store.getState())));
  });

  // Render.
  ReactDOM.render(app.root, document.createElement('div'));

  // End-to-end unit test.
  // https://github.com/apollographql/react-apollo/tree/master/examples/create-react-app#running-tests

  // Trigger async action.
  return app.store.dispatch(AppTestAction('test')).then(result => {

    //
    // Test Mutation.
    // http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient.mutate
    //
    return app.client.mutate({
      mutation: TestMutation,
      variables: {
        mutations: [
          {
            itemId: ID('Task'),
            mutations: [
              MutationUtil.createFieldMutation('title', 'string', 'Test Item')
            ]
          }
        ]
      }

    }).then(result => {
      let { upsertItems } = result.data;
      console.assert(_.size(upsertItems) === 1);
      let title = upsertItems[0].title;

      //
      // Test Query.
      // http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient.query
      //
      return app.client.query({
        query: TestQuery

      }).then(result => {
        let { search: { items } } = result.data;
        let item = _.find(items, item => item.title === title);
        console.assert(item);
      });
    });
  });
});
