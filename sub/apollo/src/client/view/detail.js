//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import TypeRegistry from '../component/typeRegistry';

/**
 * Detail view.
 */
class DetailView extends React.Component {

  static contextTypes = {
    queryRegistry: React.PropTypes.object
  };

  static propTypes = {
    data: React.PropTypes.shape({
      viewer: React.PropTypes.object,
      item: React.PropTypes.object
    })
  };

  render() {
    let { item } = this.props.data;

    // TODO(burdon): Can we ensure component is well-formed?
    if (!item) {
      return <div/>;
    }

    let detail = item && TypeRegistry.render(item);

    return (
      <div className="app-column">
        <div className="app-section">
          <h1>{ item.title }</h1>
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
//

// TODO(burdon): Dynamically change query fragments based on type? (why statically compiled AST?)

// TODO(burdon): Use directives to only include fragment of appropriate type.
// http://graphql.org/learn/queries/#inline-fragments
// ...Task @include(if: $type='Task')

// __typename
// http://graphql.org/learn/queries/#meta-fields

const DetailQuery = gql`
  query DetailQuery($userId: ID!, $itemId: ID!) { 

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
      
      __typename
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

  graphql(DetailQuery, {
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

)(DetailView);
