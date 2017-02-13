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
  let { injector, user } = AppAction.getState(state);

  return {
    // TODO(burdon): Bind needed objects instead (e.g., Matcher, TypeRegistry).
    // Provide for Mutator.graphql
    injector,

    typeRegistry: injector.get(TypeRegistry),

    // Matcher's context (same as server).
    context: {
      user: { id: user.id }
    },

    user
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

      // Map mproperties to query.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      options: (props) => {
        let { context, itemId } = props;
        let matcher = props.injector.get(Matcher);

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
      props: ({ ownProps, data }) => ({
        item: reducer.getItem(data),
        refetch: data.refetch
      })
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
