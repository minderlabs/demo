//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import gql from 'graphql-tag';
import { graphql } from 'react-apollo';

import { Fragments, ListReducer, SubscriptionWrapper } from 'minder-core';

import { List, ListItem } from 'minder-ux';

import { connectReducer } from './connector';

//-------------------------------------------------------------------------------------------------
// List renderers.
//-------------------------------------------------------------------------------------------------

const CustomIcon = ListItem.createInlineComponent((props, context) => {
  let { item } = context;
  let { typeRegistry } = props;

  return (
    <ListItem.Icon icon={ item.iconUrl || typeRegistry.icon(item.type) }/>
  )
});

const CustomColumn = ListItem.createInlineComponent((props, context) => {
  let { item } = context;
  let { typeRegistry } = props;

  let Column = typeRegistry.column(item.type);

  return (
    <div className="ux-noshrink">
      { Column &&
        <Column item={ item }/>
      }
    </div>
  );
});

/**
 * NOTE: Depends on ItemFragment fields.
 */
export const BasicListItemRenderer = (typeRegistry) => (item) => {
  return (
    <ListItem item={ item }>
      <ListItem.Favorite/>
      <ListItem.Text value={ item.title } select={ true }/>
      <CustomColumn typeRegistry={ typeRegistry }/>
      <div className="ux-icons ux-noshrink">
        <CustomIcon typeRegistry={ typeRegistry }/>
        <ListItem.DeleteButton/>
      </div>
    </ListItem>
  );
};

/**
 * Debug.
 */
export const DebugListItemRenderer = (item) => {
  return (
    <ListItem item={ item } className="ux-column">
      <ListItem.Favorite/>
      <div>
        <ListItem.Text value={ item.title }/>
        <ListItem.Debug/>
      </div>
    </ListItem>
  );
};

//-------------------------------------------------------------------------------------------------
// Basic List.
//-------------------------------------------------------------------------------------------------

// TODO(burdon): Fragments for grouping.

const BasicItemFragment = gql`
  fragment BasicItemFragment on Item {
    namespace
    fkey
    type
    id

    labels
    title
      
    ...DocumentFragment
  }

  ${Fragments.DocumentFragment}
`;

const BasicSearchQuery = gql`
  query BasicSearchQuery($filter: FilterInput) {
    search(filter: $filter) {
      items {
        ...BasicItemFragment
      }
    }
  }

  ${BasicItemFragment}
`;

export const BasicSearchList = connectReducer(ListReducer.graphql(BasicSearchQuery))(SubscriptionWrapper(List));

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

  ${Fragments.ItemFragment}
  ${Fragments.ContactFragment}
  ${Fragments.DocumentFragment}
  ${Fragments.ProjectFragment}
  ${Fragments.TaskFragment}
`;

const CardSearchQuery = gql`
  query CardSearchQuery($filter: FilterInput) {
    search(filter: $filter) {
      items {
        ...CardItemFragment

        ... on Task {
          tasks {
            ...TaskFragment
          }
        }
      }
      
      groupedItems {
        id
        groups {
          field
          ids
        }
      }      
    }
  }

  ${CardItemFragment}
`;

export const CardSearchList = connectReducer(ListReducer.graphql(CardSearchQuery))(SubscriptionWrapper(List));

//-------------------------------------------------------------------------------------------------
// Simple List.
// TODO(burdon): Obsolete: replace with above (Used by ItemPicker.)
//-------------------------------------------------------------------------------------------------

export const SimpleSearchQuery = gql`
  query SimpleSearchQuery($filter: FilterInput) {
    search(filter: $filter) {
      items {
        id
        type
        title
      }
    }
  }
`;

export const ItemsQueryWrapper = graphql(SimpleSearchQuery, {

  // http://dev.apollodata.com/react/queries.html#graphql-options
  options: (props) => {
    let { filter } = props;

    return {
      variables: {
        filter
      }
    }
  },

  // http://dev.apollodata.com/react/queries.html#graphql-props-option
  props: ({ ownProps, data }) => {
    let { search: { items } } = data;
    let { filter } = ownProps;

    return {
      items,

      refetch: () => {
        data.refetch({
          filter
        });
      },

      // Paging.
      // http://dev.apollodata.com/react/pagination.html
      // http://dev.apollodata.com/react/cache-updates.html#fetchMore
      fetchMoreItems: () => {
        filter.offset = (filter.offset || 0) + items.length;

        return data.fetchMore({
          variables: {
            filter
          },

          updateQuery: (previousResult, { fetchMoreResult }) => {
            return _.assign({}, previousResult, {
              search: {
                items: {
                  $push: fetchMoreResult.data.search.items
                }
              }
            });
          }
        });
      }
    }
  }
});
