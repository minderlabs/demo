//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Fragment from 'graphql-fragments';
import gql from 'graphql-tag';

/**
 * Fragments.
 */
export const CityFragments = {

  item: new Fragment(gql`
    fragment CityFragment on City {
      geo {
        lat
        lng
      }
    }
  `)

};

/**
 * Task
 */
export default class City extends React.Component {

  static propTypes = {
    item: CityFragments.item.propType,
  };

  // TODO(burdon): Google map.

  render() {
    return (
      <div>
        <h3>City</h3>
        <pre>
          { JSON.stringify(this.props.item.geo, null, 2) }
        </pre>
      </div>
    );
  }
}
