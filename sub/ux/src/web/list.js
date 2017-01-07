//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { TypeUtil } from 'minder-core';

import { TextBox } from './textbox';

import './list.less';

/**
 * Simple list component.
 */
export class List extends React.Component {

  /**
   * Default item renderer.
   */
  static DefaultItemRenderer = (item) => {
    return (
      <ListItem item={ item }>
        <ListItem.Title/>
      </ListItem>
    );
  };

  static DebugItemRenderer = (fields) => (item) => {
    return (
      <ListItem item={ item }>
        <ListItem.Debug fields={ fields }/>
      </ListItem>
    );
  };

  /**
   * Inline editor.
   */
  static DefaultEditor = React.createClass({

    // TODO(burdon): Modularize to extend (list ListItem).

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
            <i className="ux-icon ux-icon-action ux-icon-save" onClick={ this.handleSave }>check</i>
            <i className="ux-icon ux-icon-action ux-icon-cancel" onClick={ this.handleCancel }>cancel</i>
          </div>
        </div>
      );
    }
  });

  static childContextTypes = {
    onItemSelect: React.PropTypes.func
  };

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

  getChildContext() {
    return {
      onItemSelect: this.handleItemSelect.bind(this)
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

  /*
  handleMore() {
    this.props.fetchMoreItems().then(() => {
      // Glue to bottom.
      // TODO(burdon): Scroll-container.
      let el = $(this.refs.items);
      el[0].scrollTop = el[0].scrollHeight;
    });
  }
  */

  render() {
    let { items=[], groupBy } = this.props;

    // Rows.
    let rows = items.map(item => {

      // Primary item.
      let listItem = (
        <div key={ item.id } className='ux-list-item'>
          { this.state.itemRenderer(item) }
        </div>
      );

      // Grouped items.
      if (groupBy && !_.isEmpty(item.refs)) {
        let refs = item.refs.map(ref => (
          <div key={ ref.id } className="ux-list-item">
            { this.state.itemRenderer(ref) }
          </div>
        ));

        return (
          <div key={ item.id } className="ux-list-item-group">
            { listItem }
            <div className="ux-list-item-refs">
              { refs }
            </div>
          </div>
        )
      } else {
        return listItem;
      }
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

    let className = 'ux-list ' + (this.props.className || '');
    return (
      <div className={ className }>
        { rows }
        { editor }
      </div>
    );
  }
}

/**
 * List item component (and sub-components).
 *
 * const itemRenderer = (item) => (
 *   <ListItem item={ item }>
 *     <ListItem.Title/>
 *   </ListItem>
 * )
 */
export class ListItem extends React.Component {

  // TODO(burdon): Custom columns (by type).

  //
  // List Item Components.
  //

  static Debug = (props, context) => {
    let { item } = context;
    let { fields } = props;
    let obj = fields ? _.pick(item, fields) : item;
    return (
      <div className="ux-debug">{ JSON.stringify(obj, null, 1) }</div>
    );
  };

  static Icon = (props, context) => {
    let { item } = context;
    let { typeRegistry } = context;

    return (
      <i className="ux-icon">{ props.icon || typeRegistry.icon(item.type) }</i>
    );
  };

  static Favorite = (props, context) => {
    let { item } = context;
    let { onSetLabel } = props;

    let set = _.indexOf(item.labels, '_favorite') != -1;
    return (
      <i className="ux-icon"
         onClick={ onSetLabel.bind(null, item, '_favorite', !set) }>
        { set ? 'star' : 'star_border' }
      </i>
    );
  };

  static Title = (props, context) => {
    let { item, onItemSelect } = context;
    let { select=true } = props;

    return (
      <div className="ux-expand ux-text ux-selector"
           onClick={ select && onItemSelect.bind(null, item) }>
        { item.title }
      </div>
    );
  };

  static Delete = (props, context) => {
    let { item } = context;
    let { onDelete } = props;

    return (
      <i className="ux-icon ux-icon-delete"
         onClick={ onDelete.bind(null, item) }>cancel</i>
    );
  };

  // From parent <List/> control.
  static contextTypes = {
    onItemSelect: React.PropTypes.func,
  };

  // To child <ListItem/> components.
  static childContextTypes = {
    onItemSelect: React.PropTypes.func,
    item: React.PropTypes.object
  };

  getChildContext() {
    return {
      item: this.props.item
    }
  }

  // TODO(burdon): CSS (make ux-list-item? Document ux-data-row)
  render() {
    return (
      <div className="ux-row ux-data-row">
        { this.props.children }
      </div>
    );
  }
}

ListItem.Debug.contextTypes     = ListItem.childContextTypes;
ListItem.Icon.contextTypes      = ListItem.childContextTypes;
ListItem.Favorite.contextTypes  = ListItem.childContextTypes;
ListItem.Title.contextTypes     = ListItem.childContextTypes;
ListItem.Delete.contextTypes    = ListItem.childContextTypes;
