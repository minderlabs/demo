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
export const TaskFragments = {

  item: new Fragment(gql`
    fragment TaskFragment on Task {
      owner {
        id
        title
      }
      assignee {
        id
        title
      }
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
        <table>
          <tbody>
          <tr>
            <td>Owner</td>
            <td>{ _.get(this.props.item, 'owner.title') }</td>
          </tr>
          <tr>
            <td>Assignee</td>
            <td>{ _.get(this.props.item, 'assignee.title') }</td>
          </tr>
          </tbody>
        </table>
      </div>
    );
  }
}
