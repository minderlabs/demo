//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';

import { ID, Matcher, Mutator } from 'minder-core';

import { TypeRegistry } from './type/registry';

import { AppAction } from '../reducers';

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
 * The wrapper provides the following properties:
 * {
 *   user     (from the Redux state)
 *   mutator  (from the Redux injector)
 * }
 *
 * @param reducer
 * @returns {React.Component} Item control.
 */
export function composeItem(reducer) {
  return compose(

    // Map Redux state to properties.
    connect(mapStateToProps),

    graphql(reducer.query, {

      // Map mproperties to query.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      options: (props) => {
        let matcher = props.injector.get(Matcher);

        let { type, id:localItemId } = ID.fromGlobalId(props.itemId);

        return {
          variables: {
            itemId: props.itemId,
            localItemId: localItemId
          },

          reducer: (previousResult, action) => {
            return reducer.reduceItem(matcher, props.context, previousResult, action);
          }
        };
      },

      // Map query result to component properties.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        return {
          item: reducer.getItem(data),
          refetch: data.refetch
        };
      }
    }),

    // TODO(burdon): Provides props.mutator (too obscure)! Move here?
    Mutator.graphql(reducer.mutation)
  );
}
