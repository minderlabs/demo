//
// Copyright 2016 Minder Labs.
//

import React from 'react';

// TODO(burdon): Card decks (list).
// TODO(burdon): Drag-and-drop.
// TODO(burdon): Client-side filtering (e.g., by column, sort order, etc.)

import { ID } from 'minder-core';

import { TypeRegistry } from '../component/type/registry';

import BaseLayout from './base';

import './page.less';

/**
 * Page layout.
 */
export default class PageLayout extends React.Component {

  // TODO(burdon): UX containers.
  // Surface: Mobile, CRX, Full web page.
  // Canvas: List/Grid, Board, Map, Stickies, etc.

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
    let { itemId } = this.props.params;
    let { type } = ID.fromGlobalId(itemId);

    let typeRegistry = this.context.injector.get(TypeRegistry);
    let detail = typeRegistry.renderCanvas(type, itemId);

    return (
      <BaseLayout className="app-page-layout">
        { detail }
      </BaseLayout>
    );
  }
}
