//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import './list';

/**
 * Simple list component.
 */
export class List extends React.Component {

  // TODO(burdon): Inline create.
  // TODO(burdon): Default renderers
  // TODO(burdon): Renderers as components (with callbacks: e.g., select, save, etc.)
  // TODO(burdon): Optional chrome (e.g., create button).
  // TODO(burdon): Optional more button.

  static renderItem = (item) => (
    <div>{ item.title }</div>
  );

  static renderEditor = () => (
    <input type="text"/>
  );

  static propTypes = {
    renderItem: React.PropTypes.func.isRequired,
    renderEditor: React.PropTypes.func.isRequired,
    items: React.PropTypes.arrayOf(React.PropTypes.object)
  };

  constructor() {
    super(...arguments);

    this.state = {
      edit: false
    }
  }

  create(edit) {
    this.setState({
      edit: edit
    });
  }

  render() {
    let { items=[] } = this.props;

    let rows = items.map(item => {
      return (
        <div className="ux-list-item">
          { this.props.renderItem(item) }
        </div>
      );
    });

    // TODO(burdon): By default at the bottom.
    let editor = this.state.edit && this.props.renderEditor();

    return (
      <div className="ux-list">
        <div>
          { rows }
        </div>

        { editor }
      </div>
    );
  }
}
