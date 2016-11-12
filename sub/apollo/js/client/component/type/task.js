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
export const TaskFragments = {

  item: new Fragment(gql`
    fragment TaskFragment on Task {
      status
    }
  `)

};

/**
 * Task
 */
export default class Task extends React.Component {

  static propTypes = {
    item: TaskFragments.item.propType
  };

  render() {
    return (
      <div>
        <h3>Task</h3>
        <pre>
          { JSON.stringify(_.pick(this.props.item, ['status']), 0, 2) }
        </pre>
      </div>
    );
  }
}
