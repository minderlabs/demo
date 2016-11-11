//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';


//
// Queries
// TODO(burdon): Naming standards?
//

const GetItemsQuery = gql`
  query GetItems($text: String!) { 

    items(text: $text) {
      id
      title
      labels
    }
  }
`;

// TODO(burdon): Individual actions?
const UpdateLabelsMutation = gql`
  mutation UpdateLabels($itemId: ID!, $labels: [ArrayDelta]!) {
    
    updateLabels(itemId: $itemId, labels: $labels) {
      id
      labels
    }
  }
`;

/**
 * Home View.
 * http://dev.apollodata.com/react
 * http://dev.apollodata.com/react/higher-order-components.html
 */
@withApollo
@graphql(GetItemsQuery, {

  // Configure query (from redux state).
  // http://dev.apollodata.com/react/queries.html#graphql-options
  options: (props) => {
    let state = props.client.store.getState()['minder'];

    return {
      variables: {
        text: props.text
      }
    };
  }
})
@graphql(UpdateLabelsMutation, {

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
class List extends React.Component {

  static propTypes = {

    updateLabels: React.PropTypes.func.isRequired,

    data: React.PropTypes.shape({

      // System.
      loading: React.PropTypes.bool.isRequired,

      // TODO(burdon): Make sub-list.
      items: React.PropTypes.array
    })
  };

  handleToggleFavorite(item) {

    // Toggle
    let index = _.indexOf(item.labels, '_favorite') == -1 ? 0 : -1;

    // TODO(burdon): Mutation.
    // http://dev.apollodata.com/react/mutations.html
    this.props.updateLabels(item.id, [{ index: index, value: '_favorite' }])
      .then(({ data }) => {
        console.log('OK: %s', JSON.stringify(data));
        item.labels = data.labels;
      })
      .catch((error) => {
        console.error('Failed:', error);
      });
  }

  render() {
    let { items=[] } = this.props.data;

    let rows = items.map(item => (
      <div className="app-list-item app-row" key={ item.id }>
        <i className="material-icons" onClick={ this.handleToggleFavorite.bind(this, item) }>
          { _.indexOf(item.labels, '_favorite') == -1 ? 'star_border' : 'star' }</i>
        <div className="app-expand">{ item.title }</div>
      </div>)
    );

    return (
      <div className="app-list app-column">
        <h3>Items</h3>

        <div>
          { rows }
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    text: state.minder.search.text
  }
};

export default connect(mapStateToProps)(List);
