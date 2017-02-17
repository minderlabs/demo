//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { ItemFragment, ContactFragment, TaskFragment } from 'minder-core';
import { List } from 'minder-ux';

import { AppAction } from '../reducers';
import { TypeRegistry } from '../framework/type_registry';
import { Card } from '../component/card';
import { FullLayout } from '../layout/full';

/**
 * Testing Activity.
 * For experimental features and components.
 */
class TestingActivity extends React.Component {

  static propTypes = {
    typeRegistry: React.PropTypes.object.isRequired
  };

  state = {
    listType: 'card'
  };

  onAddItem() {
    this.refs.list.addItem();
  }

  onChangeView(listType) {
    this.setState({
      listType
    })
  }

  onItemUpdate(item) {
    console.log('Save: %s', JSON.stringify(item));
  }

  render() {
    let { typeRegistry, items } = this.props;
    let { listType } = this.state;

    let itemRenderer = null;
    switch (listType) {
      case 'card': {
        itemRenderer = Card.ItemRenderer(typeRegistry);
        break;
      }
    }

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

        <List ref="list"
              highlight={ false }
              items={ items }
              itemRenderer={ itemRenderer }
              onItemUpdate={ this.onItemUpdate.bind(this) }/>
      </FullLayout>
    );
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const TestQuery = gql`
  query TestQuery($filter: FilterInput) { 

    items(filter: $filter) {
      ...ItemFragment
      ...ContactFragment
      ...TaskFragment
      
      ... on Task {
        tasks {
          ...TaskFragment
        }
      }
    }
  }

  ${ItemFragment}
  ${ContactFragment}
  ${TaskFragment}
`;

const mapStateToProps = (state, ownProps) => {
  let { injector } = AppAction.getState(state);

  return {
    typeRegistry: injector.get(TypeRegistry)
  };
};

export default compose(
  connect(mapStateToProps),

  graphql(TestQuery, {
    options: (props) => ({
      variables: {
        filter: { type: 'Task' }
      }
    }),

    props: ({ ownProps, data }) => {
      let { loading, error, items } = data;

      return {
        loading,
        error,
        items
      };
    }
  })

)(TestingActivity);
