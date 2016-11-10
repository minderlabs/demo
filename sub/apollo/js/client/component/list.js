//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';


//
// Queries
//

const Query = gql`
  query Items($userId: ID!, $text: String!) { 

    items(userId: $userId, text: $text) {
      id
      title
    }
  }
`;

/**
 * Home View.
 * http://dev.apollodata.com/react
 * http://dev.apollodata.com/react/higher-order-components.html
 */
@withApollo
@graphql(Query, {

  // Configure query (from redux state).
  // http://dev.apollodata.com/react/queries.html#graphql-options
  options: (props) => {
    let state = props.client.store.getState()['minder'];
    return {
      variables: {
        userId: state.userId,
        text: ""                      // TODO(burdon): Current input from search component.
      }
    };
  }
})
export default class List extends React.Component {

  static propTypes = {
    data: React.PropTypes.shape({

      // System.
      loading: React.PropTypes.bool.isRequired,

      // TODO(burdon): Make sub-list.
      items: React.PropTypes.array
    })
  };

  render() {
    let { items=[] } = this.props.data;

    return (
      <div className="app-column">
        <h3>Items</h3>

        { items.map(item => <div key={ item.id }>{ item.title }</div>) }
      </div>
    );
  }
}
