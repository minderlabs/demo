//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import Fragment from 'graphql-fragments';
import gql from 'graphql-tag';

import { MutationUtil, TypeUtil } from 'minder-core';

import ItemsPicker from '../items_picker';

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

  constructor() {
    super(...arguments);

    this._values = {};
  }

  // TODO(burdon): Base class for values.
  get mutations() {
    let { item } = this.props;

    let mutations = [];

    TypeUtil.maybeAppend(mutations,
      MutationUtil.field('assignee', 'id', _.get(this._values, 'assignee'), _.get(item, 'assignee.id')));

    return mutations;
  }

  handleSelectPicker(property, item) {
    _.set(this._values, property, item.id);
  }

  render() {
    let { item } = this.props;

    let filter = {
      strict: true,
      type: 'User'
    };

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
            <td>
              <ItemsPicker filter={ filter }
                           value={ _.get(item, 'assignee.title') }
                           onSelect={ this.handleSelectPicker.bind(this, 'assignee') }/>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    );
  }
}
