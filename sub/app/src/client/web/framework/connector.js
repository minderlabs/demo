//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';

import { Fragments, Matcher, Reducer, ListReducer } from 'minder-core';

import { AppAction } from '../../common/reducers';

//-------------------------------------------------------------------------------------------------
// Connector required by reducers.
//-------------------------------------------------------------------------------------------------

const mapStateToProps = (state, ownProps) => {
  let { injector, config, client } = AppAction.getState(state);

  let matcher = injector.get(Matcher);

  // Get from cache.
  const { viewer } = client.readQuery({
    query: Fragments.ViewerQuery
  });

  let userId = _.get(viewer, 'context.user.id');
  let buckets = _.map(_.get(viewer, 'groups'), group => group.id);

  return {

    // Required by HOC reducers.
    config,
    matcher,

    // Matcher's context used by HOC reducers.
    context: {
      userId,
      buckets
    }
  }
};

/**
 * Creates HOC for item query.
 */
export class Connector {

  /**
   * HOC wrapper for reducers.
   * Adapts Redux state from the App to the minder-core reducers.
   */
  static connect(containers) {
    containers = _.concat([
      // withRef provides Access component via getWrappedInstance()
      // http://dev.apollodata.com/react/higher-order-components.html#with-ref
      // https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options
      connect(mapStateToProps, null, null, { withRef: true }),
    ], containers);

    return compose(...containers);
  }

  /**
   *
   * @param query
   * @param reducer
   */
  static itemQuery(query, reducer=undefined) {
    console.assert(query);

    // TODO(burdon): Infer path.
    if (!reducer) {
      reducer = new Reducer('item');
    }

    return graphql(query, {
      withRef: 'true',

      // Map properties to query.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      options: (props) => {
        let { matcher, context, itemId } = props;

        return {
          variables: {
            itemId
          },

          reducer: Reducer.callback(reducer, { matcher, context })
        };
      },

      // Map query result to component properties.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        let { errors, loading, refetch } = data;
        let item = reducer.getResult(data);

        return {
          errors,
          loading,
          refetch,
          item
        };
      }
    });
  }

  /**
   *
   * @param query
   * @param reducer
   */
  static searchQuery(query, reducer=undefined) {
    console.assert(query);

    // TODO(burdon): Infer path.
    if (!reducer) {
      reducer = new ListReducer('search.items');
    }

    // Return HOC.
    return graphql(query, {
      withRef: 'true',

      // Configure query variables.
      // http://dev.apollodata.com/react/queries.html#graphql-options
      // http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.query
      options: (props) => {
        let { matcher, context, filter } = props;

        // TODO(burdon): Generates a new callback each time rendered. Create property for class.
        // https://github.com/apollostack/apollo-client/blob/master/src/ApolloClient.ts
        return {
          variables: {
            filter,
          },

          reducer: Reducer.callback(reducer, { matcher, context })
        }
      },

      // Configure props passed to component.
      // http://dev.apollodata.com/react/queries.html#graphql-props
      props: ({ ownProps, data }) => {
        let { matcher, filter, itemInjector } = ownProps;
        let { errors, loading, refetch } = data;

        // Get query result.
        let items = reducer.getResult(data, []);
        let groupedItems = _.get(data, reducer.path + '.groupedItems');

        // Inject additional items (e.g., from context).
        if (itemInjector) {
          items = itemInjector(items);
        }

        return {
          errors,
          loading,
          refetch,
          matcher,

          // Data from query.
          items,
          groupedItems,

          // Paging.
          // TODO(burdon): Hook-up to UX.
          // http://dev.apollodata.com/react/pagination.html
          // http://dev.apollodata.com/react/cache-updates.html#fetchMore
          fetchMoreItems: () => {
            return data.fetchMore({
              variables: {
                filter
              },

              // TODO(burdon): Grouped items.
              updateQuery: (previousResult, { fetchMoreResult }) => {
                return _.assign({}, previousResult, {
                  items: [...reducer.getResult(previousResult), ...reducer.getResult(fetchMoreResult.data)]
                });
              }
            });
          }
        }
      }
    });
  }
}
