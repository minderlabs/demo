//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import Fragment from 'graphql-fragments';
import gql from 'graphql-tag';

/**
 * Fragments.
 */
export const PlaceFragments = {

  item: new Fragment(gql`
    fragment PlaceFragment on Place {
      geo {
        lat
        lng
      }
    }
  `)

};

/**
 * Place
 */
export default class Place extends React.Component {

  static propTypes = {
    item: PlaceFragments.item.propType
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
