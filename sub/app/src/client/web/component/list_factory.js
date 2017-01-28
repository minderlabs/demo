//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { DocumentFragment, Getter, Matcher, Mutator, ListReducer } from 'minder-core';
import { List } from 'minder-ux';

import { UpdateItemMutation } from '../data/mutations';

/**
 * Redux properties.
 *
 * @param state
 * @param ownProps
 * @returns {{injector, context: {user: {id}}}}
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
 * @param reducer Mutation reducer object.
 * @returns {React.Component} List control.
 */
function composeList(reducer) {
  return compose(

    // Access component via getWrappedInstance()
    // http://dev.apollodata.com/react/higher-order-components.html#with-ref
    // https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options
    connect(mapStateToProps, null, null, { withRef: true }),

    graphql(reducer.query, {
      withRef: 'true',

      // Configure query variables.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      // http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.query
      options: (props) => {
        let { filter, count } = props; //List.defaults(props);

        let matcher = props.injector.get(Matcher);

        // TODO(burdon): Generates a new callback each time rendered. Create property for class.
        // https://github.com/apollostack/apollo-client/blob/master/src/ApolloClient.ts
        return {
          variables: {
            filter, count, offset: 0
          },

          reducer: (previousResult, action) => {
            return reducer.reduceItems(matcher, props.context, filter, previousResult, action);
          }
        }
      },

      // Configure props passed to component.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        let items = reducer.getItems(data);
        let { filter, count } = ownProps;

        return {
          items,

          // Paging.
          // TODO(burdon): Hook-up to UX.
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
    Mutator.graphql(reducer.mutation)

  )(List);
}

/**
 * Redux and Apollo provide a withRef option to enable access to the contained component.
 * This cascades down through the connect() chain, so depending on how deeply nested the components are,
 * getWrappedInstance() needs to be called multiple times.
 *
 * @param hoc Higher-Order Component (Redux container).
 */
export const getWrappedList = function(hoc) {

  // https://github.com/apollostack/react-apollo/issues/118
  // http://dev.apollodata.com/react/higher-order-components.html#with-ref
  // https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options
  return hoc.getWrappedInstance().getWrappedInstance().getWrappedInstance();
};


//
// HOC Lists.
//

// TODO(burdon): Filter items.
// import { filter } from 'graphql-anywhere';
// <ListItem item={ filter(this.getItemFragment(), item) }

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
const ListItemFragment = gql`
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

/**
 * List of search results.
 */
const SearchQuery = gql`
  query SearchQuery($filter: FilterInput, $offset: Int, $count: Int) {

    search(filter: $filter, offset: $offset, count: $count) {
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

  ${ListItemFragment}
`;

export const SearchList = composeList(
  new ListReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: SearchQuery,
      path: 'search'
    }
  })
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

  ${ListItemFragment}
`;

export const ItemList = composeList(
  new ListReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: ItemsQuery,
      path: 'items'
    }
  })
);

/**
 * List of user items.
 * TODO(madadam): Pagination (offset/count) for tasks.
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
    
  ${ListItemFragment}
`;

const UserTasksReducer = (matcher, context, filter, previousResult, updatedItem) => {
  // TODO(burdon): Handle delete.
  if (matcher.matchItem(context, {}, filter, updatedItem)) {
    return {
      viewer: {
        user: {
          tasks: {
            $push: [ updatedItem ]
          }
        }
      }
    };
  }
};

export const UserTasksList = composeList(
  new ListReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: UserTasksQuery,
      path: 'viewer.user.tasks'
    }
  },
  UserTasksReducer)
);