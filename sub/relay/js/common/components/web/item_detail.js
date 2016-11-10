//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import { Database } from '../../data/database';
import UpdateItemMutation from '../../data/mutations/update_item';

import TypeRegistry from './type_registry';

import './item_detail.less';

/**
 * Item detail view.
 */
class ItemDetail extends React.Component {

  static getItemState(props) {
    return _.pick(props.item, ['title', 'labels']);
  }

  static propTypes = {
    viewer:   React.PropTypes.object.isRequired,
    item:     React.PropTypes.object.isRequired,
    onClose:  React.PropTypes.func.isRequired
  };

  constructor() {
    super(...arguments);

    this.state = {
      item: ItemDetail.getItemState(this.props)
    };
 }

  componentWillReceiveProps(nextProps) {
    this.setState({
      item: ItemDetail.getItemState(nextProps)
    });
  }

  handleTextChange(field, event) {
    this.setState({
      item: _.merge(this.state.item, _.set({}, field, event.target.value))
    });
  }

  handleSave(event) {
    let { viewer, item } = this.props;

    // TODO(burdon): Call context mutator.
    // Get properties from data element.
    let data = TypeRegistry.values(item.type, this.refs['data'].refs.component);  // TODO(burdon): Const "data".

    let mutation = new UpdateItemMutation({
      viewer: viewer,
      item: item,
      title: this.state.item.title,
      data: data
    });

    this.props.relay.commitUpdate(mutation);
    this.props.onClose();
  }

  handleCancel(event) {
    this.props.onClose();
  }

  handleDelete(event) {
    let { viewer, item } = this.props;

    // TODO(burdon): Call context mutator.
    let mutation = new UpdateItemMutation({
      viewer: viewer,
      item: item,
      labels: [{
        value: Database.LABEL.DELETED
      }]
    });

    this.props.relay.commitUpdate(mutation);
    this.props.onClose();
  }

  render() {
    let { viewer, item } = this.props;

    this.detail = TypeRegistry.render(viewer, item);

    const debug = false && (
      <div className="app-panel app-section app-debug">
        { JSON.stringify(item, 0, 1) }
      </div>
    );

    return (
      <div className="app-item-detail">
        <div className="app-panel app-expand">

          <div className="app-row">
            <input type="text"
                   className="app-expand app-field-title"
                   title={ item.id }
                   autoFocus="autoFocus"
                   onChange={ this.handleTextChange.bind(this, 'title') }
                   value={ this.state.item.title || "" }/>
          </div>

          <div className="app-column app-expand">
            { this.detail }
          </div>

        </div>

        { debug }

        <div className="app-toolbar">
          <button onClick={ this.handleSave.bind(this) }>Save</button>
          <button onClick={ this.handleCancel.bind(this) }>Cancel</button>
          <button onClick={ this.handleDelete.bind(this) }>Delete</button>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(ItemDetail, {

  // Example:
  // {
  //   viewer(userId:"Vmlld2VyOnJpY2g=") {
  //     id
  //     user {
  //       id
  //       title
  //     }
  //     items {
  //       id
  //       title
  //       data {
  //         __typename
  //
  //         ... on Task {
  //           priority
  //         }
  //       }
  //     }
  //   }
  // }

  fragments: {

    // TODO(burdon): Remove dep on viewer from types.
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        ${UpdateItemMutation.getFragment('viewer')}

        ${ _.map(TypeRegistry.components, (component) => component.getFragment('viewer')) }
      }
    `,

    item: (variables) => Relay.QL`
      fragment on Item {
        id
        type
        version

        title
        labels
        
        data {
          __typename
          
          ${ _.map(TypeRegistry.components, (component) => component.getFragment('data')) }
        }
        
        ${UpdateItemMutation.getFragment('item')}
      }
    `
  }
});
