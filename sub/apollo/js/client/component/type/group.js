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
export const GroupFragments = {

  item: new Fragment(gql`
    fragment GroupFragment on Group {
      members {
        id
        title
      }
    }
  `)

};

/**
 * Group
 */
export default class Group extends React.Component {

  static propTypes = {
    item: GroupFragments.item.propType
  };

  // TODO(burdon): Google map.

  render() {
    return (
      <div>
        <h3>City</h3>
        <pre>
          { JSON.stringify(_.pick(this.props.item, ['members']), 0, 2) }
        </pre>
      </div>
    );
  }
}
