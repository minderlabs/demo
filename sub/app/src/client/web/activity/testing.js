//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { List } from 'minder-ux';

import { FullLayout } from '../layout/full';

/**
 * Testing Activity.
 * For experimental features and components.
 */
class TestingActivity extends React.Component {

  // TODO(burdon): Test toggle.
  static customItemRenderer = (list, item) => {
    return (
      <div className="ux-row ux-data-row">
        <i className="ux-icon">favorite_border</i>
        <div className="ux-text">{ item.title }</div>
      </div>
    );
  };

  onAddItem() {
    this.refs.list.addItem();
  }

  onChangeView(type) {
    this.refs.list.itemRenderer = (type === 'card') && TestView.customItemRenderer;
  }

  onItemSave(item) {
    console.log('Save: %s', JSON.stringify(item));
  }

  render() {
    let { items } = this.props;

    // TODO(burdon): Select.

    return (
      <FullLayout>
        <div className="ux-toolbar">
          <div>
            <i className="ux-icon ux-icon-action"
               onClick={ this.onAddItem.bind(this, 'list') }>add</i>
          </div>
          <div>
            <i className="ux-icon ux-icon-action"
               onClick={ this.onChangeView.bind(this, 'list') }>view_list</i>
            <i className="ux-icon ux-icon-action"
               onClick={ this.onChangeView.bind(this, 'card') }>view_module</i>
          </div>
        </div>

        <List ref="list" items={ items } onItemSave={ this.onItemSave.bind(this) }/>
      </FullLayout>
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

)(TestingActivity);
