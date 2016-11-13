//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';

import Item, { ItemFragments } from './item';

/**
 * Item List.
 *
 * http://dev.apollodata.com/react/higher-order-components.html
 */
export class List extends React.Component {

  static contextTypes = {
    queryRegistry: React.PropTypes.object
  };

  static propTypes = {

    onItemSelect: React.PropTypes.func.isRequired,

    updateItem: React.PropTypes.func.isRequired,

    data: React.PropTypes.shape({
      items: React.PropTypes.array
    })
  };

  componentWillReceiveProps(nextProps) {
    this.context.queryRegistry.register(this, nextProps.data);
  }

  handleItemSelect(item) {
    this.props.onItemSelect(item);
  }

  handleLabelUpdate(item, label, add=true) {
    let mutation = [
      {
        key: 'labels',
        value: {
          list: {
            index: add ? 0 : -1,
            value: {
              string: label
            }
          }
        }
      }
    ];

    this.props.updateItem(item.id, mutation);
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
      
      ...ItemFragment
    }
  }
`;

const UpdateItemMutation = gql`
  mutation UpdateItemMutation($itemId: ID!, $deltas: [ObjectDelta]!) {
    
    updateItem(itemId: $itemId, deltas: $deltas) {
      id
      labels
      title
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  let { minder } = state;

  return {
    matcher: minder.matcher,
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
    filter = {
      text: text
    }
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
        fragments: ItemFragments.item.fragments(),

        variables: {
          filter: updateFilter(filter, text),
          offset: 0,
          count: 10
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
      updateItem: (itemId, deltas) => mutate({
        variables: {
          itemId: itemId,
          deltas: deltas
        },

        // TODO(burdon): Optimistic UI.
        // http://dev.apollodata.com/react/optimistic-ui.html
        // http://dev.apollodata.com/react/mutations.html#optimistic-ui
        // optimisticResponse: {},

        // Called after optimisticResponse and once mutation has been returned from server.
        // https://github.com/apollostack/apollo-client/issues/621
        // http://dev.apollodata.com/react/cache-updates.html#updateQueries
        updateQueries: {
          ItemsQuery: (prev, { mutationResult, queryVariables }) => {
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
        },

        // TODO(burdon): Reducer?
        // http://dev.apollodata.com/react/cache-updates.html#resultReducers
        reducer: (previousResult, action) => {
          console.log('Reducer: %s', JSON.stringify(action));
        }
      })
    })
  })

)(List);
