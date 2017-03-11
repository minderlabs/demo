//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { compose } from 'react-apollo';
import gql from 'graphql-tag';

import { ItemReducer, ItemFragment, ContactFragment } from 'minder-core';
import { List, ReactUtil } from 'minder-ux';

import { connectReducer } from '../framework/connector';
import { Canvas } from '../component/canvas';
import { Card } from '../component/card';

import { TaskListItemRenderer } from './task';

//-------------------------------------------------------------------------------------------------
// Components.
//-------------------------------------------------------------------------------------------------

/**
 * Card.
 */
export class ContactCard extends React.Component {

  static contextTypes = {
    mutator: React.PropTypes.object.isRequired
  };

  static propTypes = {
    item: React.PropTypes.object.isRequired
  };

  handleTaskAdd() {
    this.refs.tasks.addItem();
  }

  handleItemUpdate(item, mutations) {
    let { mutator } = this.context;

    if (item) {
      mutator.updateItem(item, mutations);
    } else {
      // TODO(burdon): Add task to contact.
      console.log(mutations);
      console.warn('Not implemented.');
    }
  }

  render() {
    let { item:contact } = this.props;
    let { email, tasks } = contact;

    return (
      <Card ref="card" item={ contact }>
        <div className="ux-card-section">
          <div>{ email }</div>
        </div>

        { !_.isEmpty(tasks) &&
          <div className="ux-card-section">
            <h3>Tasks</h3>
          </div>
        }
        <div className="ux-list-tasks">
          <div className="ux-scroll-container">
            <List ref="tasks"
                  items={ tasks }
                  itemRenderer={ TaskListItemRenderer }
                  onItemUpdate={ this.handleItemUpdate.bind(this) }/>
          </div>

          <div className="ux-card-footer">
            <i className="ux-icon ux-icon-add" onClick={ this.handleTaskAdd.bind(this) }/>
          </div>
        </div>
      </Card>
    );
  }
}

/**
 * Canvas.
 */
export class ContactCanvasComponent extends React.Component {

  static propTypes = {
    refetch: React.PropTypes.func.isRequired,
    item: React.PropTypes.object
  };

  handleSave() {
    return [];
  }

  render() {
    return ReactUtil.render(this, () => {
      let { item:contact, refetch } = this.props;
      let { email } = contact;

      return (
        <Canvas ref="canvas"
                item={ contact }
                refetch={ refetch }
                onSave={ this.handleSave.bind(this)}>

          <div className="ux-section">
            <div className="ux-section-body ux-font-small">
              <div>{ email }</div>
            </div>
          </div>
        </Canvas>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const ContactQuery = gql`
  query ContactQuery($itemId: ID!) {
    item(itemId: $itemId) {
      ...ItemFragment
      ...ContactFragment
    }
  }

  ${ItemFragment}
  ${ContactFragment}  
`;

export const ContactCanvas = compose(
  connectReducer(ItemReducer.graphql(ContactQuery))
)(ContactCanvasComponent);
