//
// Copyright 2016 Minder Labs.
//

'use strict';

import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

// TODO(burdon): Move to core and factor out with list.
// TODO(burdon): Pass in fragment.

const ItemsQuery = gql`
  query ItemsQuery($filter: FilterInput, $offset: Int, $count: Int) { 

    items(filter: $filter, offset: $offset, count: $count) {
      id
      type      
      title
    }
  }
`;

// TODO(burdon): Name ItemsQueryWrapper
export default graphql(ItemsQuery, {

  options: (props) => {
    let { filter, count } = props;

    return {
      variables: {
        filter, count, offset: 0
      }
    }
  },

  props: ({ ownProps, data }) => {
    let { items } = data;
    let { filter, count } = ownProps;

    return {
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
