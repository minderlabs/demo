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

  static propTypes = {

    updateLabels: React.PropTypes.func.isRequired,

    data: React.PropTypes.shape({
      loading: React.PropTypes.bool.isRequired,

      items: React.PropTypes.array
    })
  };

  handleLabelUpdate(item, label, add=true) {

    // http://dev.apollodata.com/react/mutations.html
    this.props.updateLabels(item.id, [{ index: add ? 0 : -1, value: label }])
      .then(({ data }) => {
        console.log('OK: %s', JSON.stringify(data));
      });
  }

  handleMore() {
    this.props.fetchMoreItems().then(() => {
      // Glue to bottom.
      let el = $(this.refs.items);
      el[0].scrollTop = el[0].scrollHeight;
    });
  }

  render() {
    let { items=[] } = this.props;

    return (
      <div className="app-column app-list">
        <div ref="items" className="app-column app-scroll-container">
          {items.map(item =>
          <Item key={ item.id }
                item={ ItemFragments.item.filter(item) }
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

const GetItemsQuery = gql`
  query GetItems($text: String, $offset: Int, $count: Int) { 

    items(text: $text, offset: $offset, count: $count) {
      id
      
      ...ItemFragment
    }
  }
`;

const UpdateLabelsMutation = gql`
  mutation UpdateLabels($itemId: ID!, $labels: [ArrayDelta]!) {
    
    updateLabels(itemId: $itemId, labels: $labels) {
      id
      labels
    }
  }
`;

const mapStateToProps = (state, ownProps) => {

  return {
    text: state.minder.search.text
  }
};

export default compose(

  connect(mapStateToProps),

  graphql(GetItemsQuery, {

    // Configure query (from redux state).
    // http://dev.apollodata.com/react/queries.html#graphql-options
    options: ({ text }) => {
      return {
        fragments: ItemFragments.item.fragments(),

        variables: {
          text: text,
          offset: 0,
          count: 10
        }
      };
    },

    // http://dev.apollodata.com/react/pagination.html
    props({ ownProps: { text }, data: { loading, items, fetchMore } }) {
      return {
        loading,
        text,
        items,

        // TODO(burdon): Paging bug when non-null text filter.
        // https://github.com/apollostack/apollo-client/issues/897
        // "There can only be one fragment named ItemFragment" (from server).
        // http://dev.apollodata.com/react/cache-updates.html#fetchMore
        fetchMoreItems() {
          return fetchMore({
            variables: {
              text: text,
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

  graphql(UpdateLabelsMutation, {

    props: ({ mutate }) => ({
      updateLabels: (itemId, labels) => mutate({
        variables: {
          itemId: itemId,
          labels: labels
        },

        // TODO(burdon): Optimistic UI.
        // http://dev.apollodata.com/react/optimistic-ui.html
        // http://dev.apollodata.com/react/mutations.html#optimistic-ui
        optimisticResponse: {},

        // TODO(burdon): Reducer.
        // http://dev.apollodata.com/react/cache-updates.html#resultReducers
        reducer: (previousResult, action) => {
          console.log('reducer: %s', JSON.stringify(action));
        },

        // TODO(burdon): Check query miss.
        // http://dev.apollodata.com/react/cache-updates.html#updateQueries
        updateQueries: {}
      })
    })
  })

)(List);
