//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';

import { IdGenerator, Matcher, Mutator } from 'minder-core';

import { AppAction, GlobalAppReducer } from '../../common/reducers';

/**
 * NOTE: This is applied to the child container..
 */
const mapStateToProps = (state, ownProps) => {
  let { injector, registration } = AppAction.getState(state);

  // Required by graphql HOC.
  let idGenerator = injector.get(IdGenerator);
  let matcher = injector.get(Matcher);

  return {
    // Required by HOC.
    idGenerator, matcher,

    registration,

    // Matcher's context (same as server).
    context: {
      userId: _.get(registration, 'userId')
    }
  }
};

/**
 * The HOC wrapper provides the following properties:
 * {
 *   user     (from the Redux state)
 *   mutator  (from the Redux injector)
 * }
 *
 * @param {ItemReducer} reducer
 * @param containers Additional HOC containers.
 * @returns {React.Component} Item control.
 */
export function composeItem(reducer, ...containers) {
  console.assert(reducer);

  let args = [

    // Map Redux state to properties.
    connect(mapStateToProps),

    //
    // GraphQL query.
    //
    graphql(reducer.query, {

      // Map properties to query.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      options: (props) => {
        let { matcher, context, itemId } = props;

        return {
          variables: {
            itemId
          },

          // Binding for global reducer.
          metadata: {
            subscription: GlobalAppReducer.SUBSCRIPTION.NAVBAR_ITEM
          },

          reducer: (previousResult, action) => {
            return reducer.reduceItem(matcher, context, previousResult, action);
          }
        };
      },

      // Map query result to component properties.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        let { loading, error, refetch } = data;

        let item = reducer.getItem(data);

        return {
          loading,
          error,
          refetch,

          item
        }
      }
    })
  ];

  if (reducer.mutation) {
    //
    // GraphQL mutation.
    // Provides props.mutator.
    //
    args.push(Mutator.graphql(reducer.mutation));
  }

  // TODO(burdon): Deconstruct so that caller composes directly (helper -- don't obfuscate apollo).
  return compose(
    ...args,
    ...containers
  );
}
