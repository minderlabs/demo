//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';

import Item from './item';

/**
 * Item List.
 *
 * http://dev.apollodata.com/react/higher-order-components.html
 */
export class List extends React.Component {

  static propTypes = {

    updateLabels: React.PropTypes.func.isRequired,

    data: React.PropTypes.shape({

      // System.
      loading: React.PropTypes.bool.isRequired,

      // TODO(burdon): Make sub-list.
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
      <div className="app-column ">
        <div ref="items" className="app-section app-column app-list">
          {items.map(item =>
          <Item key={ item.id } item={ item } onLabelUpdate={ this.handleLabelUpdate.bind(this) }/>
          )}
        </div>

        <div className="app-section app-row">
          <button className="app-expand" onClick={ this.handleMore.bind(this) }>More</button>
        </div>
      </div>
    );
  }
}


//
// Queries
// TODO(burdon): Factor out bindings (keep component dry).
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
    options: (props) => {
      return {
        fragments: Item.fragments.item.fragments(),

        variables: {
          text: props.text,
          offset: 0,
          count: 10
        }
      };
    },

    // http://dev.apollodata.com/react/pagination.html
    props({ data: { loading, items, fetchMore } }) {
      return {
        loading,
        items,

        fetchMoreItems() {
          return fetchMore({
            variables: {
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

    // TODO(burdon): Optimistic UI.
    // http://dev.apollodata.com/react/mutations.html#optimistic-ui
    props: ({ mutate }) => ({
      updateLabels: (itemId, labels) => mutate({
        variables: {
          itemId: itemId,
          labels: labels
        }
      })
    })
  })

)(List);
