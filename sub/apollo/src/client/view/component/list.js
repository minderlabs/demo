//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { Matcher, QueryParser, Mutator, Reducer } from 'minder-core';

import { UpdateItemMutation } from '../../data/mutations';
import { QueryRegistry } from '../../data/subscriptions';

import TypeRegistry from './type_registry'; // TODO(burdon): Inject.

import Item, { ItemFragments } from './item';

const queryParser = new QueryParser();

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

    data: React.PropTypes.shape({
      items: React.PropTypes.array
    })
  };

  componentWillReceiveProps(nextProps) {
    this.props.injector.get(QueryRegistry).register(this, nextProps.data);
  }

  handleItemSelect(item) {
    this.props.onItemSelect(item);
  }

  handleLabelUpdate(item, label, add=true) {
    let mutation = [
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

    this.props.mutator.updateItem(item, mutation);
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

    // TODO(burdon): Track scroll position in redux so that it can be restored.

    return (
      <div className="app-column app-list">
        <div ref="items" className="app-column app-scroll-container">
          {items.map(item =>
          <Item key={ item.id }
                item={ ItemFragments.item.filter(item) }
                icon={ TypeRegistry.icon(item.type) }
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

const ItemsQuery = gql`
  query ItemsQuery($filter: FilterInput, $offset: Int, $count: Int) { 

    items(filter: $filter, offset: $offset, count: $count) {
      id
      __typename
      
      ...ItemFragment
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  let { minder } = state;

  return {
    injector: minder.injector,

    // TODO(burdon): This shouldn't be tied to the textbox (many lists).
    text: minder.search.text
  }
};

/**
 * Override current filter (redux state should trump filter set by parent).
 * @param filter
 * @param text
 */
const updateFilter = (filter, text) => {
  filter = _.omitBy(filter, (v) => v === null);

  if (text) {
    filter = queryParser.parse(text);
  }

  return filter;
};

export default compose(

  connect(mapStateToProps),

  graphql(ItemsQuery, {

    // Configure query variables.
    // http://dev.apollodata.com/react/queries.html#graphql-options
    options: (props) => {
      let { filter, text } = props;

      return {
        // TODO(burdon): Can we pass variables to fragments?
        fragments: ItemFragments.item.fragments(),

        variables: {
          filter: updateFilter(filter, text),
          offset: 0,
          count: 20   // TODO(burdon): Const.
        },

        reducer: Reducer.reduce(props.injector.get(Matcher), TypeRegistry, UpdateItemMutation, ItemsQuery, filter),
      }
    },

    // Configure props passed to component.
    // http://dev.apollodata.com/react/queries.html#graphql-props
    // http://dev.apollodata.com/react/pagination.html
    props: ({ ownProps, data }) => {
      let { items, refetch, fetchMore } = data;
      let { filter, text } = ownProps;

      return {
        data,

        // http://dev.apollodata.com/react/cache-updates.html#fetchMore
        fetchMoreItems: () => {
          return fetchMore({
            variables: {
              filter: updateFilter(filter, text),
              offset: items.length
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
