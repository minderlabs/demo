//
// Copyright 2016 Minder Labs.
//

import React from 'react';

// TODO(burdon): Card decks (list).
// TODO(burdon): Drag-and-drop.
// TODO(burdon): Inline create/edit. Factor out list control.
// TODO(burdon): Client-side filtering (e.g., by column, sort order, etc.)

import BaseLayout from './base';

import './board.less';

/**
 * Board layout.
 */
export default class BoardLayout extends React.Component {

  render() {
    return (
      <BaseLayout className="app-board-layout">
      </BaseLayout>
    );
  }
}
