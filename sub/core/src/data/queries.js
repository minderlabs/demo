//
// Copyright 2016 Minder Labs.
//

import gql from 'graphql-tag';
import { graphql } from 'react-apollo';

const ItemsQuery = gql`
  query ItemsQuery($filter: FilterInput, $offset: Int, $count: Int) { 

    items(filter: $filter, offset: $offset, count: $count) {
      id
      type      
      title
    }
  }
`;

/**
 * Wraps ItemsQuery managing filters.
 */
export const ItemsQueryWrapper = graphql(ItemsQuery, {

  // http://dev.apollodata.com/react/queries.html#graphql-options
  options: (props) => {
    let { filter, count } = props;

    return {
      variables: {
        filter, count, offset: 0
      }
    }
  },

  // http://dev.apollodata.com/react/queries.html#graphql-props-option
  props: ({ ownProps, data }) => {
    let { items } = data;
    let { filter, count } = ownProps;

    return {
      // Result.
      items: data.items,

      // Called when variables are updated.
      refetch: (filter) => {
        data.refetch({
          filter
        });
      },

      // Paging.
      // http://dev.apollodata.com/react/pagination.html
      // http://dev.apollodata.com/react/cache-updates.html#fetchMore
      fetchMoreItems: () => {
        return data.fetchMore({
          variables: {
            filter, count, offset: items.length
          },

          // TODO(burdon): Use update({ $push }).
          updateQuery: (previousResult, { fetchMoreResult }) => {
            return _.assign({}, previousResult, {
              items: [...previousResult.items, ...fetchMoreResult.data.items]
            });
          }
        });
      }
    }
  }
});
