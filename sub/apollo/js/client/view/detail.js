//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

/**
 * Detail view.
 */
class Detail extends React.Component {

  static propTypes = {
    data: React.PropTypes.shape({
      viewer: React.PropTypes.object,
      item: React.PropTypes.object
    })
  };

  render() {
    let { item } = this.props.data;

    return (
      <div className="app-column">
        <div className="app-section">
          <h1>Detail</h1>
          <div>
            { JSON.stringify(item) }
          </div>
        </div>
      </div>
    );
  }
}

//
// Queries
// TODO(burdon): Factor out queries.
//

const Query = gql`
  query Home($userId: ID!, $itemId: ID!) { 

    viewer(userId: $userId) {
      id
      user {
        name
      }
    }
    
    item(itemId: $itemId) {
      id
      labels
      title
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  return {
    userId: state.minder.userId
  }
};

export default compose(
  connect(mapStateToProps),

  graphql(Query, {
    options: (props) => {
      return {
        variables: {
          userId: props.userId,
          itemId: props.params.itemId
        }
      };
    }
  })

)(Detail);
