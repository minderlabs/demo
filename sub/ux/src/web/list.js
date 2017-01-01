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
  // TODO(burdon): Replace list_factory.
  // TODO(burdon): Replace Project card lists.

  // TODO(burdon): Inline editor.
  // TODO(burdon): Auto more (and button).

  // TODO(burdon): By default render icon (callout).

  /**
   *
   * @param list
   * @param item
   * @returns {XML}
   * @constructor
   */
  static DefaultItemRenderer = (list, item) => {
    return (
      <div className="ux-row ux-data-row">
        <div className="ux-text">{ item.title }</div>
      </div>
    );
  };

  /**
   *
   */
  static DefaultEditor = React.createClass({

    // TODO(burdon): How to generalize extend?

    handleSave() {
      let title = this.refs.title.value;
      this.props.onSave && this.props.onSave({ title });
    },

    handleCancel() {
      this.props.onCancel && this.props.onCancel();
    },

    render() {
      let { item } = this.props;
      let title = item && item.title;

      return (
        <div className="ux-row ux-data-row">
          <TextBox ref="title" className="ux-expand"
                   value={ title }
                   autoFocus={ true }
                   onEnter={ this.handleSave }
                   onCancel={ this.handleCancel }/>

          <div>
            <i className="ux-icon ux-icon-actio ux-icon-save" onClick={ this.handleSave }>check</i>
            <i className="ux-icon ux-icon-actio ux-icon-cancel" onClick={ this.handleCancel }>cancel</i>
          </div>
        </div>
      );
    }
  });

  static propTypes = {
    className: React.PropTypes.string,
    items: React.PropTypes.arrayOf(React.PropTypes.object),
    itemRenderer: React.PropTypes.func,
    itemEditor: React.PropTypes.func,
    showAdd: React.PropTypes.bool,
    onItemSave: React.PropTypes.func,
    onItemSelect: React.PropTypes.func
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
      showAdd: this.props.showAdd,
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

  addItem(item) {
    this.setState({
      showAdd: true
    });
  }

  // TODO(burdon): Standardize selection for items.
  handleItemSelect(item) {
    this.props.onItemSelect && this.props.onItemSelect(item);
  }

  handleItemSave(item) {
    this.props.onItemSave && this.props.onItemSave(item);
    this.setState({
      showAdd: false,
      editedItem: null
    });
  }

  handleItemCancel() {
    this.setState({
      showAdd: false,
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
    if (this.state.showAdd) {
      const Editor = List.DefaultEditor;
      editor = (
        <div className="ux-list-item ux-list-editor">
          <Editor item={ this.state.editedItem }
                  onSave={ this.handleItemSave.bind(this) }
                  onCancel={ this.handleItemCancel.bind(this) }
          />
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
