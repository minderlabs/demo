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

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  static propTypes = {
    viewer: React.PropTypes.object.isRequired,
    item: React.PropTypes.object.isRequired
  };

  constructor(props, context) {
    super(props, context);

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
    let { item } = this.props;

    this.props.relay.commitUpdate(
      new UpdateItemMutation({
        item: item,

        title: this.state.item.title
      })
    );

    this.context.router.goBack();   // TODO(burdon): Should be handled by parent container (via event?)
  }

  handleCancel(event) {
    this.context.router.goBack();   // TODO(burdon): Should be handled by parent container (via event?)
  }

  render() {
    let { viewer, item } = this.props;

    let detail = TypeRegistry.render(viewer, item);

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
            { detail }
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

  fragments: {
    viewer: (variables) => Relay.QL`
      fragment on Viewer {
        id

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
