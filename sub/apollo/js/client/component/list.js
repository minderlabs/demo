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

  render() {
    let { items=[] } = this.props.data;

    return (
      <div className="app-section app-column app-list">
        {items.map(item =>
        <Item key={ item.id } item={ item } onLabelUpdate={ this.handleLabelUpdate.bind(this) }/>
        )}
      </div>
    );
  }
}


//
// Queries
// TODO(burdon): Factor out bindings (keep component dry).
//

const GetItemsQuery = gql`
  query GetItems($text: String) { 

    items(text: $text) {
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
          text: props.text
        }
      };
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
