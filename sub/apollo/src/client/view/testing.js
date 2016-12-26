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
        <div className="ux-toolbar">
          <h2>Test</h2>
          <div>
            <i className="ux-icon ux-icon-action">view_list</i>
            <i className="ux-icon ux-icon-action">view_module</i>
          </div>
        </div>

        <List items={ items }/>
      </div>
    );
  }
}

const TestQuery = gql`
  query TestQuery($filter: FilterInput) { 

    items(filter: $filter) {
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
    options: (props) => {
      return {
        variables: {
          filter: { type: 'Task' }
        }
      };
    },

    props: ({ ownProps, data }) => {
      let { items } = data;
      return {
        items
      };
    }
  })

)(TestView);
