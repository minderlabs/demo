//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { Matcher, Mutator, Reducer } from 'minder-core';

import { UpdateItemMutation } from '../data/mutations';

import { TypeRegistry } from './type/registry';
import { List } from './list';

/**
 * Redux properties.
 *
 * @param state
 * @param ownProps
 * @returns {{injector: *, context: {user: {id}}}}
 */
const mapStateToProps = (state, ownProps) => {
  let { minder } = state;

  return {
    // Provide for Mutator.graphql
    injector: minder.injector,
    context: {
      user: { id: minder.user.id }
    }
  }
};

/**
 * List factory, compose a List component from a query.
 *
 * @param query Gql object that defines the query to fetch items for this list.
 * @param getItemsFromData function(data) => items, converts query response to list items.
 * @returns {*} React component.
 */
function composeList(query, getItemsFromData) {
  return compose(

    connect(mapStateToProps),

    graphql(query, {

      // Configure query variables.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      // http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.query
      options: (props) => {
        let { filter, count } = List.defaults(props);

        let matcher = props.injector.get(Matcher);
        let typeRegistry = props.injector.get(TypeRegistry);

        // https://github.com/apollostack/apollo-client/blob/master/src/ApolloClient.ts
        return {
          reducer: Reducer.reduce(props.context, matcher, typeRegistry, UpdateItemMutation, query, filter),

          variables: {
            filter, count, offset: 0
          }
        }
      },

      // Configure props passed to component.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        let items = getItemsFromData(data);
        let { filter, count } = ownProps;

        return {
          data,
          items,

          // Paging.
          // http://dev.apollodata.com/react/pagination.html
          // http://dev.apollodata.com/react/cache-updates.html#fetchMore
          fetchMoreItems: () => {
            return data.fetchMore({
              variables: {
                filter, count, offset: items.length
              },

              updateQuery: (previousResult, { fetchMoreResult }) => {
                return _.assign({}, previousResult, {
                  items: [...previousResult.items, ...fetchMoreResult.data.items]
                });
              }
            });
          }
        }
      }
    }),

    // Provides mutator property.
    Mutator.graphql(UpdateItemMutation)

  )(WrappedList);
}

//
// HOC Lists.
//

/**
 * Wrapped HOC list.
 */
class WrappedList extends List {

  // TODO(burdon): Warning: fragment with name ListItemFragment already exists.
  // May be spurious (see http://dev.apollodata.com/react/fragments.html)
  // https://github.com/apollostack/graphql-tag/pull/22 [12/1/16] => 0.6

  /**
   * Defines properties needed by Item.
   * NOTE: External definition used by static propTypes.
   *
   * http://dev.apollodata.com/react/fragments.html#reusing-fragments
   * http://dev.apollodata.com/core/fragments.html
   * http://github.com/apollostack/graphql-fragments
   */
  static ListItemFragment = gql`
    fragment ListItemFragment on Item {
      __typename
      id
      type
  
      labels
      title
    }
  `;

  getItemFragment() {
    return WrappedList.ListItemFragment;
  }
}

// TODO(burdon): Test if this still fails (need to issue query).
// TODO(burdon): Apollo Client enforces all fragment names across your application to be unique.
// https://github.com/apollostack/apollo-client/blob/master/src/fragments.ts#L52
const FRAG = gql`
  fragment FRAG on Item {
    __typename
  }
`;

const Q1 = gql`
  query Q1 {
    item {
      __typename
    }
    ${FRAG}
  }
`;

const Q2 = gql`
  query Q2 {
    item {
      __typename
    }
    ${FRAG}
  }
`;

/**
 * Generic list of items.
 */
const ItemsQuery = gql`
  query ItemsQuery($filter: FilterInput, $offset: Int, $count: Int) {

    items(filter: $filter, offset: $offset, count: $count) {
      __typename
      id

      ... ListItemFragment
    }
  }

  ${WrappedList.ListItemFragment}
`;

export const ItemsList = composeList(
  ItemsQuery,

  (data) => {
    return data.items
  }
);

/**
 * List of user items.
 *
 * TODO(burdon): Change tasks to filtered items.
 * TODO(madadam): Pagination (offset/count) for user.tasks.
 */
const UserTasksQuery = gql`
  query UserTasksQuery($filter: FilterInput) {

    viewer {
      id
      
      user {
        id
        tasks(filter: $filter) {
          __typename
          id
          
          ... ListItemFragment
        }
      }
    }
  }
    
  ${WrappedList.ListItemFragment}
`;

export const UserTasksList = composeList(
  UserTasksQuery,

  (data) => {
    return (data.viewer && data.viewer.user && data.viewer.user.tasks) || [];
  }
);
