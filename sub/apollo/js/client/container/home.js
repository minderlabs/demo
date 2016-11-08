//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';

//
// Queries
//

// TODO(burdon): How to pass args to query?

const Query = gql`
  query user { 
    user(id: "minder") {
      id
      name
    }
  }
`;

// TODO(burdon): @withApollo
// http://dev.apollodata.com/react/higher-order-components.html

/**
 * Home View.
 */
@graphql(Query)
export default class Home extends React.Component {

  render() {
    return (
      <div>
        <h2>Home</h2>
        <div>
          <pre>{ JSON.stringify(this.props.data.user) }</pre>
        </div>
      </div>
    );
  }
}
