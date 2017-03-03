//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import gql from 'graphql-tag';

import {
  ItemFragment,
  ContactFragment,
  DocumentFragment,
  ProjectFragment,
  TaskFragment,
  ListReducer
} from 'minder-core';

import { QueryRegistry } from 'minder-core';
import { List, ListItem } from 'minder-ux';

import { connectReducer } from './connector';

//-------------------------------------------------------------------------------------------------
// List renderers.
//-------------------------------------------------------------------------------------------------

const CustomIcon = ListItem.createInlineComponent((props, context) => {
  let { item } = context;
  let { typeRegistry } = props;

  return (
    <ListItem.Icon icon={ item.iconUrl || typeRegistry.icon(item.type) }/>
  )
});

const CustomColumn = ListItem.createInlineComponent((props, context) => {
  let { item } = context;
  let { typeRegistry } = props;

  let Column = typeRegistry.column(item.type);

  return (
    <div className="ux-noshrink">
      { Column &&
        <Column item={ item }/>
      }
    </div>
  );
});

/**
 * NOTE: Depends on ItemFragment fields.
 */
export const BasicListItemRenderer = (typeRegistry) => (item) => {
  return (
    <ListItem item={ item }>
      <ListItem.Favorite/>
      <ListItem.Title select={ true }/>
      <CustomColumn typeRegistry={ typeRegistry }/>
      <div className="ux-icons ux-noshrink">
        <CustomIcon typeRegistry={ typeRegistry }/>
        <ListItem.Delete/>
      </div>
    </ListItem>
  );
};

/**
 * Debug.
 */
export const DebugListItemRenderer = (item) => {
  return (
    <ListItem item={ item } className="ux-column">
      <ListItem.Favorite/>
      <div>
        <ListItem.Title select={ true }/>
        <ListItem.Debug/>
      </div>
    </ListItem>
  );
};

/**
 * Wraps basic List component adding subscriptions.
 */
class ListWrapper extends React.Component {

  static defaultProps = {
    cid: QueryRegistry.createId()
  };

  static contextTypes = {
    queryRegistry: React.PropTypes.object.isRequired
  };

  componentWillMount() {
    this.context.queryRegistry.register(this.props.cid, this.props.refetch);
  }

  componentWillUnmount() {
    this.context.queryRegistry.unregister(this.props.cid);
  }

  render() {
    return <List { ...this.props }/>
  }
}

//-------------------------------------------------------------------------------------------------
// Basic List.
//-------------------------------------------------------------------------------------------------

const BasicItemFragment = gql`
  fragment BasicItemFragment on Item {
    namespace
    fkey
    type
    id

    labels
    title
      
    ...DocumentFragment
  }

  ${DocumentFragment}
`;

const BasicSearchQuery = gql`
  query BasicSearchQuery($filter: FilterInput, $offset: Int, $count: Int) {
    search(filter: $filter, offset: $offset, count: $count) {
      ...BasicItemFragment

      # TODO(burdon): Generalize grouping?
      ... on Project {
        refs {
          ...BasicItemFragment
        }
      }
    }
  }

  ${BasicItemFragment}
`;

export const BasicSearchList = connectReducer(ListReducer.graphql(BasicSearchQuery))(ListWrapper);

//-------------------------------------------------------------------------------------------------
// Card List.
//-------------------------------------------------------------------------------------------------

/**
 * Contains all fragments (since any card may be rendered).
 */
const CardItemFragment = gql`
  fragment CardItemFragment on Item {
    ...ItemFragment
    ...ContactFragment
    ...DocumentFragment
    ...ProjectFragment
    ...TaskFragment
  }

  ${ItemFragment}
  ${ContactFragment}
  ${DocumentFragment}
  ${ProjectFragment}
  ${TaskFragment}
`;

const CardSearchQuery = gql`
  query CardSearchQuery($filter: FilterInput, $offset: Int, $count: Int) {
    search(filter: $filter, offset: $offset, count: $count) {
      ...CardItemFragment

      ... on Task {
        tasks {
          ...TaskFragment
        }
      }
    }
  }

  ${CardItemFragment}
`;

export const CardSearchList = connectReducer(ListReducer.graphql(CardSearchQuery))(ListWrapper);
