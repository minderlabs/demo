//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';

import { ID } from 'minder-core';

import { TypeRegistry } from '../component/type/registry';

import './detail.less';

/**
 * Detail view.
 */
export default class DetailView extends React.Component {

  // TODO(burdon): Rename CardView.

  /**
   * Properties set by the router.
   */
  static propTypes = {
    params: React.PropTypes.shape({
      type: React.PropTypes.string,
      itemId: React.PropTypes.string
    })
  };

  static contextTypes = {
    injector: React.PropTypes.object.isRequired
  };

  render() {
    let { view, itemId } = this.props.params;
    let { type } = ID.fromGlobalId(itemId);

    console.log('Detail[%s:%s]: %s', type, view, itemId);
    let typeRegistry = this.context.injector.get(TypeRegistry);
    return typeRegistry.card(type, itemId);
  }
}
