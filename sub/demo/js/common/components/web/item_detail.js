//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import UpdateItemMutation from '../../mutations/update_item';

import TypeRegistry from './type_registry';

import './item_detail.less';

/**
 * Item detail view.
 */
class ItemDetail extends React.Component {

  static propTypes = {
    viewer:   React.PropTypes.object.isRequired,
    item:     React.PropTypes.object.isRequired,
    onClose:  React.PropTypes.func.isRequired
  };

  constructor() {
    super(...arguments);

    this.state = {
      item: _.pick(this.props.item, ['title', 'labels'])
    }
  }

  handleTextChange(field, event) {
    this.setState({
      item: _.merge(this.state.item, _.set({}, field, event.target.value))
    });
  }

  handleSave(event) {
    let { viewer, item } = this.props;

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

  render() {
    let { viewer, item } = this.props;

    this.detail = TypeRegistry.render(viewer, item);

    return (
      <div className="app-item-detail">
        <div className="app-panel app-expand">

          <div className="app-row">
            <input type="text"
                   className="app-expand app-field-title"
                   title={ item.id }
                   autoFocus="autoFocus"
                   onChange={ this.handleTextChange.bind(this, 'title') }
                   value={ this.state.item.title }/>
          </div>

          <div className="app-column app-expand">
            { this.detail }
          </div>

        </div>

        <div className="app-panel app-section app-debug">
          { JSON.stringify(item, 0, 1) }
        </div>

        <div className="app-toolbar">
          <button onClick={ this.handleSave.bind(this) }>Save</button>
          <button onClick={ this.handleCancel.bind(this) }>Cancel</button>
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
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

        ${UpdateItemMutation.getFragment('viewer')}

        ${ _.map(TypeRegistry.types, (type) => type.getFragment('viewer')) }
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
          
          ${ _.map(TypeRegistry.types, (type) => type.getFragment('data')) }
        }
        
        ${UpdateItemMutation.getFragment('item')}
      }
    `
  }
});
