//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';

import { Matcher, Mutator } from 'minder-core';

import { AppAction } from '../reducers';

import { TypeRegistry } from './type_registry';

/**
 * NOTE: This is applied to the child container (e.g., TaskCardComponent).
 */
const mapStateToProps = (state, ownProps) => {
  let { injector, userId } = AppAction.getState(state);

  return {
    // Provide for Mutator.graphql
    injector,

    // TODO(burdon): Get from injector?
    typeRegistry: injector.get(TypeRegistry),

    // Matcher's context (same as server).
    context: {
      userId
    },

    userId
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
        let { itemId, context, injector } = props;
        let matcher = injector.get(Matcher);

        return {
          variables: {
            itemId
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
    // TODO(burdon): Optional.
    args.push(Mutator.graphql(reducer.mutation));
  }

  // TODO(burdon): Deconstruct so that caller composes directly (helper -- don't obfuscate apollo).
  return compose(
    ...args,
    ...containers
  );
}
