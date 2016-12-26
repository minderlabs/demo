//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { TextBox } from './textbox';

import './list.less';

/**
 * Simple list component.
 */
export class List extends React.Component {

  // TODO(burdon): Events.
  // TODO(burdon): Optional chrome (e.g., create button).
  // TODO(burdon): Optional more button.

  static defaultItemRenderer = (list, item) => {
    return (
      <div>{ item.title }</div>
    );
  };

  // TODO(burdon): onCreate event.
  // TODO(burdon): Inline editor.
  static defaultEditor = (list) => {
    return (
      <TextBox/>
    );
  };

  static propTypes = {
    items: React.PropTypes.arrayOf(React.PropTypes.object),
    renderItem: React.PropTypes.func,
    renderEditor: React.PropTypes.func
  };

  static defaultProps = {
    renderItem: List.defaultItemRenderer,
    renderEditor: List.defaultEditor
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

    // Rows.
    let rows = items.map(item => {
      return (
        <div key={ item.id } className="ux-list-item">
          { this.props.renderItem(this, item) }
        </div>
      );
    });

    // TODO(burdon): By default at the bottom.
    let editor = this.state.edit && this.props.renderEditor(this);

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
