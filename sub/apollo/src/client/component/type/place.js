//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import gql from 'graphql-tag';
import { propType } from 'graphql-anywhere';

import { composeItem, CardContainer, ItemFragment } from '../item';

/**
 * Type-specific fragment.
 */
const PlaceFragment = gql`
  fragment PlaceFragment on Place {
    geo {
      lat
      lng
    }
  }
`;

/**
 * Type-specific query.
 */
const PlaceQuery = gql`
  query PlaceQuery($itemId: ID!) { 
    
    item(itemId: $itemId) {
      ...ItemFragment
      ...PlaceFragment
    }
  }

  ${ItemFragment}
  ${PlaceFragment}  
`;

/**
 * Type-specific card container.
 */
class PlaceCard extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: propType(PlaceFragment)
  };

  render() {
    let { item } = this.props;

    return (
      <CardContainer mutator={ this.props.mutator } item={ item } onSave={ this.handleSave.bind(this) }>
        <PlaceLayout ref="item" item={ item }/>
      </CardContainer>
    );
  }
}

/**
 * Type-specific layout.
 */
export class PlaceLayout extends React.Component {

  static propTypes = {
    user: React.PropTypes.object.isRequired,
    item: propType(PlaceFragment)
  };

  // TODO(burdon): Google map.

  render() {
    return (
      <div className="app-type-place ux-column ux-section">
        <pre>
          { JSON.stringify(_.pick(this.props.item, ['geo']), 0, 2) }
        </pre>
      </div>
    );
  }
}

/**
 * HOC.
 */
export default composeItem(PlaceQuery)(PlaceCard);
