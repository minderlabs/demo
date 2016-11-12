//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import TypeRegistry from '../component/registry';

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

    let detail = item && TypeRegistry.render(item);

    return (
      <div className="app-column">
        <div className="app-section">
          <h1>Detail</h1>
          <pre>
            { JSON.stringify(item, null, 2) }
          </pre>
        </div>

        <div className="app-section">
          { detail }
        </div>
      </div>
    );
  }
}

//
// Queries
// TODO(burdon): Factor out queries.
//

// TODO(burdon): Dynamically change query fragments based on type? (why statically compiled AST?)

const Query = gql`
  query Home($userId: ID!, $itemId: ID!) { 

    viewer(userId: $userId) {
      id
      user {
        title
      }
    }
    
    item(itemId: $itemId) {
      id
      type
      labels
      title
      
      ${_.map(TypeRegistry.names, (name) => '...' + name).join('\n')}
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
        fragments: TypeRegistry.fragments,

        variables: {
          userId: props.userId,
          itemId: props.params.itemId
        }
      };
    }
  })

)(Detail);
