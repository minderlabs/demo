//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { Getter, Matcher, Mutator, ListReducer } from 'minder-core';
import {
  ItemFragment,
  ContactFragment,
  DocumentFragment,
  ProjectFragment,
  TaskFragment,
  UpdateItemMutation
} from 'minder-core';

import { List, ListItem } from 'minder-ux';

import { AppAction } from '../reducers';

// TODO(burdon): Document injector.
const mapStateToProps = (state, ownProps) => {
  let { injector, user } = AppAction.getState(state);

  return {
    // Provide for Mutator.graphql
    injector,
    context: {
      user: { id: user.id }
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
 * @param {ListReducer} reducer Mutation reducer object.
 * @returns {React.Component} List control.
 */
function composeList(reducer) {
  console.assert(reducer);
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

  // TODO(burdon): Move to minder-core.

  // https://github.com/apollostack/react-apollo/issues/118
  // http://dev.apollodata.com/react/higher-order-components.html#with-ref
  // https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options
  return hoc.getWrappedInstance().getWrappedInstance().getWrappedInstance();
};

//-------------------------------------------------------------------------------------------------
// Basic List.
//-------------------------------------------------------------------------------------------------

const BasicItemFragment = gql`
  fragment BasicItemFragment on Item {
    namespace
    id
    type

    labels
    title
      
    ...DocumentFragment
  }

  ${DocumentFragment}
`;

const BasicSearchQuery = gql`
  query BasicSearchQuery($filter: FilterInput, $offset: Int, $count: Int) {

    search(filter: $filter, offset: $offset, count: $count) {
      ...BasicItemFragment

      # TODO(burdon): Generalize grouping?
      ... on Project {
        refs {
          ...BasicItemFragment
        }
      }
    }
  }

  ${BasicItemFragment}
`;

export const BasicSearchList = composeList(
  new ListReducer({
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    },
    query: {
      type: BasicSearchQuery,
      path: 'search'
    }
  })
);

const CustomIcon = ListItem.createInlineComponent((props, context) => {
  let { item } = context;
  let { typeRegistry } = props;
  return (
    <ListItem.Icon icon={ item.iconUrl || typeRegistry.icon(item) }/>
  )
});

const CustomColumn = ListItem.createInlineComponent((props, context) => {
  let { item } = context;
  let { typeRegistry } = props;
  let column = typeRegistry.column(item);
  return (
    <div className="ux-noshrink">{ column }</div>
  );
});

/**
 * NOTE: Depends on ItemFragment fields.
 */
export const BasicListItemRenderer = (typeRegistry) => (item) => {
  return (
    <ListItem item={ item }>
      <ListItem.Favorite/>
      <ListItem.Title select={ true }/>
      <CustomColumn typeRegistry={ typeRegistry }/>
      <div className="ux-icons ux-noshrink">
        <CustomIcon typeRegistry={ typeRegistry }/>
        <ListItem.Delete/>
      </div>
    </ListItem>
  );
};

//-------------------------------------------------------------------------------------------------
// Card List.
//-------------------------------------------------------------------------------------------------

/**
 * Contains all fragments (since any card may be rendered).
 */
const CardItemFragment = gql`
  fragment CardItemFragment on Item {
    ...ItemFragment
    ...ContactFragment
    ...DocumentFragment
    ...ProjectFragment
    ...TaskFragment
  }

  ${ItemFragment}
  ${ContactFragment}
  ${DocumentFragment}
  ${ProjectFragment}
  ${TaskFragment}
`;

const CardSearchQuery = gql`
  query CardSearchQuery($filter: FilterInput, $offset: Int, $count: Int) {

    search(filter: $filter, offset: $offset, count: $count) {
      ...CardItemFragment

      ... on Task {
        tasks {
          ...TaskFragment
        }
      }
    }
  }

  ${CardItemFragment}
`;

export const CardSearchList = composeList(
  new ListReducer({
    query: {
      type: CardSearchQuery,
      path: 'search'
    },
    mutation: {
      type: UpdateItemMutation,
      path: 'updateItem'
    }
  })
);
