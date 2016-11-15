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

  // TODO(burdon): Different fragments for different item view types.

  // TODO(burdon): $taskFilter must be unique and set by parent DetailQuery query.

  // TODO(burdon): Query prefix (e.g., two collections of items? How to configure fragments for each?)

  // TODO(burdon): Pass variables to fragments (e.g., filter tasks).
  // https://github.com/apollostack/react-apollo/issues/140
  // https://github.com/apollostack/react-apollo/issues/122

  item: new Fragment(gql`
    fragment UserFragment on User {
      title
      
      tasks(filter: { labels: ["_favorite"] }) {
        title
      }
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
        <pre>
          { JSON.stringify(_.pick(this.props.item, ['email']), 0, 2) }
        </pre>
      </div>
    );
  }
}
