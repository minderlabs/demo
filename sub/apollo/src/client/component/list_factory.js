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
import { DocumentFragment } from './type/document';
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
 * @param itemsGetter function(data) => items, converts query response to list items.
 * @returns {*} React component.
 */
function composeList(query, itemsGetter) {
  return compose(

    connect(mapStateToProps),

    graphql(query, {

      // Configure query variables.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      // http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.query
      options: (props) => {
        let { filter, count, shouldAggregate } = List.defaults(props);

        let matcher = props.injector.get(Matcher);
        let typeRegistry = props.injector.get(TypeRegistry);

        // TODO(burdon): Generates a new callback each time rendered. Create property for class.
        // https://github.com/apollostack/apollo-client/blob/master/src/ApolloClient.ts
        return {
          reducer: Reducer.reduce(props.context, matcher, typeRegistry, UpdateItemMutation, query, filter),

          variables: {
            filter, count, offset: 0, shouldAggregate
          }
        }
      },

      // Configure props passed to component.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        let items = itemsGetter(data);
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

  // TODO(burdon): Rewrite without inheritance.

  // TODO(burdon): Warning: fragment with name ListItemFragment already exists.
  // May be spurious (see http://dev.apollodata.com/react/fragments.html)
  // https://github.com/apollostack/graphql-tag/pull/22 [12/1/16] => 0.6

  // TODO(madadam). Each type-specific ListItem type needs to define its own fragment. Currently hard-coded
  // here (e.g. DocumentFragment). Instead, getItemFragment should iterate over the TypeRegistry to get
  // type-specific fragments to include.

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
        
      ...DocumentFragment
    }
    ${DocumentFragment}
  `;

  getItemFragment() {
    return WrappedList.ListItemFragment;
  }
}

/**
 * List of search results.
 */
const SearchQuery = gql`
  query SearchQuery($filter: FilterInput, $offset: Int, $count: Int, $shouldAggregate: Boolean) {

    search(filter: $filter, offset: $offset, count: $count, shouldAggregate: $shouldAggregate) {
      __typename
      id

      ...ListItemFragment
      
      ...on Project {
          refs {
              ...ListItemFragment
          }
      }
    }
  }

  ${WrappedList.ListItemFragment}
`;

export const SearchList = composeList(
  SearchQuery,

  (data) => {
    return data.search
  }
);

/**
 * Generic list of items.
 */
const ItemsQuery = gql`
  query ItemsQuery($filter: FilterInput, $offset: Int, $count: Int) {

    items(filter: $filter, offset: $offset, count: $count) {
      __typename
      id

      ...ListItemFragment
    }
  }

  ${WrappedList.ListItemFragment}
`;

export const ItemList = composeList(
  ItemsQuery,

  (data) => {
    return data.items
  }
);

/**
 * List of user items.
 *
 * TODO(burdon): Change tasks to filtered items (i.e., make generic -- see GraphQL).
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
          
          ...ListItemFragment
        }
      }
    }
  }
    
  ${WrappedList.ListItemFragment}
`;

export const UserTaskList = composeList(
  UserTasksQuery,

  (data) => {
    return (data.viewer && data.viewer.user && data.viewer.user.tasks) || [];
  }
);
