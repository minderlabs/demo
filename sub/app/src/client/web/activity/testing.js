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
import { FullLayout } from '../layout/full';

/**
 * Testing Activity.
 * For experimental features and components.
 */
class TestingActivity extends React.Component {

  static propTypes = {
    typeRegistry: React.PropTypes.object.isRequired
  };

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

  onItemUpdate(item) {
    console.log('Save: %s', JSON.stringify(item));
  }

  render() {
    let { typeRegistry, items } = this.props;

    const itemRenderer = List.CardRenderer(typeRegistry);

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
