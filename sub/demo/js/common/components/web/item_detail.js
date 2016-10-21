//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';

import UpdateItemMutation from '../../mutations/update_item';

import './item_detail.less';

/**
 * Generic data item.
 */
class ItemDetail extends React.Component {

  static contextTypes = {
    router: React.PropTypes.object.isRequired
  };

  static propTypes = {
    item: React.PropTypes.object.isRequired
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      item: _.pick(this.props.item, ['title', 'status', 'labels'])
    }
  }

  handleTextChange(field, event) {
    this.setState({
      item: _.merge(this.state.item, _.set({}, field, event.target.value))
    });
  }

  handleSave(event) {
    let { user, item } = this.props;

    this.props.relay.commitUpdate(
      new UpdateItemMutation({
        user: user,
        item: item,

        title: this.state.item.title
      })
    );

    this.context.router.goBack();
  }

  handleCancel(event) {
    this.context.router.goBack();
  }

  render() {
    let { item } = this.props;

    return (
      <div className="app-item-detail">
        <input type="text" className="app-expand app-field-title" title={ item.id } autoFocus="autoFocus"
               onChange={ this.handleTextChange.bind(this, 'title') }
               value={ this.state.item.title }/>

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
    item: () => Relay.QL`
      fragment on Item {
        id
        title
        labels

        ${UpdateItemMutation.getFragment('item')}
      }
    `
  }
});
