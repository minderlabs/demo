//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { List } from 'minder-ux';

/**
 * Testing view for experimental features and components.
 */
class TestView extends React.Component {

  render() {
    let { items } = this.props;

    return (
      <div>
        <div className="ux-section-header">
          <h2>Test</h2>
        </div>

        <List items={ items }/>
      </div>
    );
  }
}

const TestQuery = gql`
  query TestQuery { 

    folders {
      id
      title
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  return {};
};

export default compose(
  connect(mapStateToProps),

  graphql(TestQuery, {
    props: ({ ownProps, data }) => {
      let { folders } = data;

      return {
        items: folders
      };
    }
  })

)(TestView);
