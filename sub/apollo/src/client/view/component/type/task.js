//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import Fragment from 'graphql-fragments';
import gql from 'graphql-tag';

import ListPicker from '../list_picker';

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

    // TODO(burdon): Generalize utils.
    let value = _.get(this._values, 'assignee');
    if (!_.isEmpty(value) && value !== _.get(item, 'assignee.id')) {
      mutations.push({
        field: 'assignee',
        value: {
          id: value
        }
      });
    }

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
              <ListPicker filter={ filter }
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
