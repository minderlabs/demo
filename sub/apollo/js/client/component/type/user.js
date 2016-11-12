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
export const UserFragments = {

  item: new Fragment(gql`
    fragment UserFragment on User {
      username
    }
  `)

};

/**
 * User
 */
export default class User extends React.Component {

  static propTypes = {
    item: UserFragments.item.propType
  };

  // TODO(burdon): Google map.

  render() {
    return (
      <div>
        <h3>City</h3>
        <pre>
          { JSON.stringify(_.pick(this.props.item, ['username']), 0, 2) }
        </pre>
      </div>
    );
  }
}
