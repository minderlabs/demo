//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { Matcher, Mutator, Reducer } from 'minder-core';

import { UpdateItemMutation } from '../../data/mutations';

import { TypeRegistry } from './type/registry';
import { List } from './list';
import { ListItem } from './list_item';

/**
 * Redux
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
 * TODO(burdon): Factor out.
 *
 * @param query
 * @param getItemsFromData
 * @returns {*}
 */
export function composeListForQuery(query, getItemsFromData) {
  return compose(

    connect(mapStateToProps),

    graphql(query, {

      // Configure query variables.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      options: (props) => {
        let { filter, count } = List.defaults(props);

        let matcher = props.injector.get(Matcher);
        let typeRegistry = props.injector.get(TypeRegistry);

        return {
          // TODO(burdon): Can we pass variables to fragments?
          fragments: ListItem.Fragments.item.fragments(),

          variables: {
            filter, count, offset: 0
          },

          reducer: Reducer.reduce(props.context, matcher, typeRegistry, UpdateItemMutation, query, filter),
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

  )(List);
}

//
// Queries
//

const ItemsQuery = gql`
  query ItemsQuery($filter: FilterInput, $offset: Int, $count: Int) {

    items(filter: $filter, offset: $offset, count: $count) {
      __typename
      id

      ...ItemFragment
    }
  }
`;

export const ItemsList = composeListForQuery(
  ItemsQuery,

  (data) => {
    return data.items
  }
);

// TODO(burdon): Why isn't this a fragment?
// TODO(madadam): Pagination (offset/count) for user.tasks.
const UserTasksQuery = gql`
  query UserTasksQuery($filter: FilterInput) {

  viewer {
    id
    
    user {
      id
      tasks(filter: $filter) {
        __typename
        id
        
        ...ItemFragment
      }
    }
  }
}`;

export const UserTasksList = composeListForQuery(
  UserTasksQuery,

  (data) => {
    return (data.viewer && data.viewer.user && data.viewer.user.tasks) || [];
  }
);
