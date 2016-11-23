//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { Matcher, Mutator, Reducer } from 'minder-core';

import { UpdateItemMutation } from '../../data/mutations';
import { QueryRegistry } from '../../data/subscriptions';

import { TypeRegistry } from './type_registry';

import { Item } from './item';

/**
 * Item List.
 *
 * http://dev.apollodata.com/react/higher-order-components.html
 */
export class List extends React.Component {

  static propTypes = {
    injector: React.PropTypes.object.isRequired,
    mutator: React.PropTypes.object.isRequired,

    onItemSelect: React.PropTypes.func.isRequired,

    count: React.PropTypes.number,

    data: React.PropTypes.shape({
      items: React.PropTypes.array
    })
  };

  // NOTE: React.defaultProps is called after Redux.
  static defaults = (props) => {
    return _.defaults({}, props, {
      count: 20
    });
  };

  componentWillReceiveProps(nextProps) {
    this.props.injector.get(QueryRegistry).register(this, nextProps.data);
  }

  handleItemSelect(item) {
    this.props.onItemSelect(item);
  }

  // TODO(burdon): Move down.
  handleLabelUpdate(item, label, add=true) {
    let mutations = [
      {
        field: 'labels',
        value: {
          array: {
            index: add ? 0 : -1,
            value: {
              string: label
            }
          }
        }
      }
    ];

    this.props.mutator.updateItem(item, mutations);
  }

  handleMore() {
    this.props.fetchMoreItems().then(() => {
      // Glue to bottom.
      let el = $(this.refs.items);
      el[0].scrollTop = el[0].scrollHeight;
    });
  }

  render() {
    let { items=[] } = this.props.data;

    let typeRegistry = this.props.injector.get(TypeRegistry);

    // TODO(burdon): Track scroll position in redux so that it can be restored.

    return (
      <div className="app-column app-list">
        <div ref="items" className="app-column app-scroll-container">
          {items.map(item =>
          <Item key={ item.id }
                item={ Item.Fragments.item.filter(item) }
                icon={ typeRegistry.icon(item.type) }
                onSelect={ this.handleItemSelect.bind(this, item) }
                onLabelUpdate={ this.handleLabelUpdate.bind(this) }/>
          )}
        </div>

        <div className="app-row app-toolbar">
          <button className="app-expand" onClick={ this.handleMore.bind(this) }>More</button>
        </div>
      </div>
    );
  }
}

//
// Queries
//

// TODO(burdon): Factor out.

const ItemsQuery = gql`
  query ItemsQuery($filter: FilterInput, $offset: Int, $count: Int) { 

    items(filter: $filter, offset: $offset, count: $count) {
      __typename

      id
      
      ...ItemFragment
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  let { minder } = state;

  return {
    // Provide for Mutator.graphql
    injector: minder.injector
  }
};

export default compose(

  connect(mapStateToProps),

  graphql(ItemsQuery, {

    // Configure query variables.
    // http://dev.apollodata.com/react/queries.html#graphql-options
    options: (props) => {
      let { filter, count } = List.defaults(props);

      let matcher = props.injector.get(Matcher);
      let typeRegistry = this.props.injector.get(TypeRegistry);

      return {
        // TODO(burdon): Can we pass variables to fragments?
        fragments: Item.Fragments.item.fragments(),

        variables: {
          filter, count, offset: 0
        },

        reducer: Reducer.reduce(matcher, typeRegistry, UpdateItemMutation, ItemsQuery, filter),
      }
    },

    // Configure props passed to component.
    // http://dev.apollodata.com/react/queries.html#graphql-props
    props: ({ ownProps, data }) => {
      let { items } = data;
      let { filter, count } = ownProps;

      return {
        data,

        // Paging.
        // http://dev.apollodata.com/react/pagination.html
        // http://dev.apollodata.com/react/cache-updates.html#fetchMore
        fetchMoreItems: () => {
          return data.fetchMore({
            variables: {
              filter, count, offset: items.length
            },

            updateQuery: (previousResult, { fetchMoreResult }) => {
              return _.assign({}, previousResult, {
                items: [...previousResult.items, ...fetchMoreResult.data.items]
              });
            }
          });
        }
      }
    }
  }),

  // Provides mutator property.
  Mutator.graphql(UpdateItemMutation)

)(List);
