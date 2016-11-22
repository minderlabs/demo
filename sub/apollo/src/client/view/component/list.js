//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import update from 'immutability-helper';
import gql from 'graphql-tag';

import { ID, Matcher, QueryParser, TypeUtil } from 'minder-core';

import { UpdateItemMutation } from '../../data/mutation';
import { QueryRegistry } from '../../data/subscriptions';

import TypeRegistry from './typeRegistry';
import Item, { ItemFragments } from './item';

const queryParser = new QueryParser();

/**
 * Item List.
 *
 * http://dev.apollodata.com/react/higher-order-components.html
 */
export class List extends React.Component {

  static propTypes = {
    onItemSelect: React.PropTypes.func.isRequired,
    queryRegistry: React.PropTypes.object.isRequired,
    updateItem: React.PropTypes.func.isRequired,

    data: React.PropTypes.shape({
      items: React.PropTypes.array
    })
  };

  componentWillReceiveProps(nextProps) {
    this.props.queryRegistry.register(this, nextProps.data);
  }

  handleItemSelect(item) {
    this.props.onItemSelect(item);
  }

  handleLabelUpdate(item, label, add=true) {
    let mutation = [
      {
        field: 'labels',
        value: {
          array: {
            index: add ? 0 : -1,
            value: {
              string: label
            }
          }
        }
      }
    ];

    this.props.updateItem(item, mutation);
  }

  handleMore() {
    this.props.fetchMoreItems().then(() => {
      // Glue to bottom.
      let el = $(this.refs.items);
      el[0].scrollTop = el[0].scrollHeight;
    });
  }

  render() {
    let { items=[] } = this.props.data;

    // TODO(burdon): Track scroll position in redux so that it can be restored.

    return (
      <div className="app-column app-list">
        <div ref="items" className="app-column app-scroll-container">
          {items.map(item =>
          <Item key={ item.id }
                item={ ItemFragments.item.filter(item) }
                icon={ TypeRegistry.icon(item.type) }
                onSelect={ this.handleItemSelect.bind(this, item) }
                onLabelUpdate={ this.handleLabelUpdate.bind(this) }/>
          )}
        </div>

        <div className="app-row app-toolbar">
          <button className="app-expand" onClick={ this.handleMore.bind(this) }>More</button>
        </div>
      </div>
    );
  }
}

//
// Queries
//

const ItemsQuery = gql`
  query ItemsQuery($filter: Filter, $offset: Int, $count: Int) { 

    items(filter: $filter, offset: $offset, count: $count) {
      id
      __typename
      
      ...ItemFragment
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  let { minder } = state;

  return {
    queryRegistry: minder.injector.get(QueryRegistry),
    matcher: minder.injector.get(Matcher),

    // TODO(burdon): Make list more general purpose (i.e., not bound to state/search box).
    text: minder.search.text
  }
};

/**
 * Override current filter (redux state should trump filter set by parent).
 * @param filter
 * @param text
 */
const updateFilter = (filter, text) => {
  filter = _.omitBy(filter, (v) => v === null);

  if (text) {
    filter = queryParser.parse(text);
  }

  return filter;
};

export default compose(

  connect(mapStateToProps),

  graphql(ItemsQuery, {

    // Configure query variables.
    // http://dev.apollodata.com/react/queries.html#graphql-options
    options: (props) => {
      let { filter, text } = props;

      return {
        // TODO(burdon): Can we pass variables?
        fragments: ItemFragments.item.fragments(),

        variables: {
          filter: updateFilter(filter, text),
          offset: 0,
          count: 20
        },

        // TODO(burdon): Use reducer to invalidate other cached queries?
        // https://github.com/apollostack/apollo-client/issues/903
        // http://dev.apollodata.com/react/cache-updates.html#resultReducers
        reducer: (previousResult, action) => {
          console.log('###### ItemsQuery.reducer[%s:%s]', action.type, action.operationName);
          if (action.type === 'APOLLO_MUTATION_RESULT' && action.operationName === 'UpdateItemMutation') {
            let item = action.result.data.updateItem;
            console.log('>>>>>> %s ===> %s', TypeUtil.JSON(item), TypeUtil.JSON(previousResult));

            // TODO(burdon): Unit test.
            // TODO(burdon): Delete.
            // TODO(burdon): Distinguish create from update.
            // TODO(burdon): Factor out mutation and query logic (into sub/graphql).
            // TODO(burdon): Need to preserve sort order (if set, otherwise top/bottom of list).
            // https://github.com/kolodny/immutability-helper
            // https://facebook.github.io/react/docs/update.html#available-commands
            let result = update(previousResult, {
              items: {
                $apply: (items) => {
                  // Find existing.
                  let existing = _.find(items, existing => existing.id === item.id);
                  if (!existing) {
                    return update(items, { $push: [item] });
                  }
                }
              }
            });

//          console.log('==####', result);
            return result;
          }

          return previousResult;
        }
      };
    },

    // Configure props passed to component.
    // http://dev.apollodata.com/react/queries.html#graphql-props
    // http://dev.apollodata.com/react/pagination.html
    props: ({ ownProps, data }) => {
      let { items, refetch, fetchMore } = data;
      let { filter, text } = ownProps;

      return {
        data,

        // http://dev.apollodata.com/react/cache-updates.html#fetchMore
        fetchMoreItems: () => {
          return fetchMore({
            variables: {
              filter: updateFilter(filter, text),
              offset: items.length
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

  graphql(UpdateItemMutation, {
    props: ({ ownProps, mutate }) => ({
      updateItem: (item, mutation) => mutate({
        variables: {
          itemId: ID.toGlobalId(item.type, item.id),
          deltas: mutation
        },

        // TODO(burdon): Optimistic UI.
        // http://dev.apollodata.com/react/optimistic-ui.html
        // http://dev.apollodata.com/react/mutations.html#optimistic-ui
        // optimisticResponse: {},

        // TODO(burdon): Only called once -- can't invalidate other folder.
        // https://github.com/apollostack/apollo-client/issues/903

        // Called after optimisticResponse and once mutation has been returned from server.
        // https://github.com/apollostack/apollo-client/issues/621
        // http://dev.apollodata.com/react/cache-updates.html#updateQueries
        updateQueries: {
          ItemsQuery: (prev, { mutationResult, queryVariables }) => {
            console.log('###### UpdateItemMutation.updateQueries: %s', JSON.stringify(queryVariables));
            // TODO(burdon): Doesn't update other queries (e.g., favorites).

            // TODO(burdon): Factor out.
            // Check if mutated item still matched current filter.
            let mutatedItem = mutationResult.data.updateItem;
            console.assert(mutatedItem);
            let match = ownProps.matcher.match(queryVariables.filter, mutatedItem);

            let items = [];
            _.each(prev.items, (item) => {
              if (item.id === mutatedItem.id) {
                if (match) {
                  items.push(mutatedItem);
                }
              } else {
                items.push(item);
              }
            });

            return {
              items: items
            };
          }
        }
      })
    })
  })

)(List);
