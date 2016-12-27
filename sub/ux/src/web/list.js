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

  // Integration:
  // TODO(burdon): Replace Project card lists.
  // TODO(burdon): Replace Folder view lists.

  // TODO(burdon): Inline editor.
  // TODO(burdon): Auto more (and button).

  static DefaultItemRenderer = (list, item) => {
    return (
      <div className="ux-row ux-data-row">
        <div className="ux-text">{ item.title }</div>
      </div>
    );
  };

  // TODO(burdon): Add save/cancel buttons.
  static DefaultEditor = React.createClass({

    onSave() {
      let title = this.refs.title.value;
      this.props.onSave && this.props.onSave({ title });
    },

    render() {
      // TODO(burdon): Value doesn't change.
      let { item } = this.props;
      let title = item && item.title;

      return (
        <div className="ux-row ux-data-row">
          <TextBox ref="title" className="ux-expand" value={ title } onEnter={ this.onSave }/>
          <i className="ux-icon ux-icon-action" onClick={ this.onSave }>add</i>
        </div>
      );
    }
  });

  static propTypes = {
    className: React.PropTypes.string,
    items: React.PropTypes.arrayOf(React.PropTypes.object),
    itemRenderer: React.PropTypes.func,
    itemEditor: React.PropTypes.func,
    onItemSave: React.PropTypes.func,
    addItem: React.PropTypes.bool
  };

  static defaultProps = {
    itemRenderer: List.DefaultItemRenderer,
    itemEditor: List.DefaultEditor
  };

  constructor() {
    super(...arguments);

    this.state = {
      itemRenderer: this.props.itemRenderer,
      itemEditor: this.props.itemEditor,
      editedItem: null
    }
  }

  set itemRenderer(itemRenderer) {
    this.setState({
      itemRenderer: itemRenderer || List.DefaultItemRenderer
    });
  }

  set itemEditor(itemEditor) {
    this.setState({
      itemEditor: itemEditor || List.DefaultItemRenderer
    });
  }

  onItemSave(item) {
    this.props.onItemSave && this.props.onItemSave(item);
    this.setState({
      editedItem: null
    });
  }

  render() {
    let { items=[] } = this.props;

    // Rows.
    let rows = items.map(item => {
      return (
        <div key={ item.id } className="ux-list-item">
          { this.state.itemRenderer(this, item) }
        </div>
      );
    });

    // Editor.
    // TODO(burdon): By default at the bottom.
    let editor = null;
    if (this.props.addItem) {
      const Editor = List.DefaultEditor;
      editor = (
        <div className="ux-list-item ux-list-editor">
          <Editor item={ this.state.editedItem } onSave={ this.onItemSave.bind(this) }/>
        </div>
      );
    }

    let className = 'ux-list ' + this.props.className || '';

    return (
      <div className={ className }>
        { rows }
        { editor }
      </div>
    );
  }
}
