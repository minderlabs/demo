//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { TextBox } from './textbox';
import { ItemDragSource, ItemDropTarget, DragOrderModel } from './dnd';

import './list.less';

//
// Drag and Drop.
//

const ListItemDragSource = ItemDragSource('ListItem');
const ListItemDropTarget = ItemDropTarget('ListItem');

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
    className:          React.PropTypes.string,
    data:               React.PropTypes.string,                               // Custom data.
    items:              React.PropTypes.arrayOf(React.PropTypes.object),
    itemRenderer:       React.PropTypes.func,
    itemEditor:         React.PropTypes.func,
    itemOrderModel:     React.PropTypes.object,                               // Order model for drag and drop.
    onItemSave:         React.PropTypes.func,
    onItemSelect:       React.PropTypes.func,
    onItemDrop:         React.PropTypes.func,
    groupBy:            React.PropTypes.bool,
    showAdd:            React.PropTypes.bool
  };

  static defaultProps = {
    itemRenderer: List.DefaultItemRenderer,
    itemEditor: List.DefaultEditor
  };

  constructor() {
    super(...arguments);

    this.state = {
      items: this.props.items || [],
      itemRenderer: this.props.itemRenderer || List.DefaultItemRenderer,
      itemEditor: this.props.itemEditor,
      showAdd: this.props.showAdd,
      editedItem: null
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      items: nextProps.items || []
    });
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

  handleItemDrop(dropItem, data, order) {
    console.assert(dropItem && dropItem.id);

    // Update the order.
    let changes = this.props.itemOrderModel.setOrder(this.props.items, dropItem.id, data, order);

    // Repaint and notify parent.
    this.forceUpdate(() => {
      this.props.onItemDrop(this.props.data, dropItem.id, changes);
    });
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
    let { data, itemOrderModel, groupBy } = this.props;
    let { items, itemRenderer } = this.state;

    //
    // Rows.
    //

    if (itemOrderModel) {
      items = itemOrderModel.getOrderedItems(items);
    }

    let previousOrder = 0;
    let rows = _.map(items, item => {

      // Primary item.
      let listItem = (
        <div key={ item.id } className='ux-list-item'>
          { itemRenderer(item) }
        </div>
      );

      // If supports dragging, wrap with drag container.
      // TODO(burdon): Drop target isn't necessarily required on list.
      if (itemOrderModel) {
        // Get the order from the state (if set); otherwise invent one.
        let actualOrder = itemOrderModel.getOrder(item.id);
        let itemOrder = actualOrder || previousOrder + 1;

        // Calculate the dropzone order (i.e., midway between the previous and current item).
        let dropOrder = (previousOrder == 0) ? previousOrder : DragOrderModel.split(previousOrder, itemOrder);

        listItem = (
          <ListItemDropTarget key={ item.id } data={ data } order={ dropOrder }
                              onDrop={ this.handleItemDrop.bind(this) }>

            <ListItemDragSource data={ item.id } order={ actualOrder }>
              { listItem }
            </ListItemDragSource>
          </ListItemDropTarget>
        );

        previousOrder = itemOrder;
      } else {

        // Grouped items.
        // TODO(burdon): Can't group with drag?
        if (groupBy && !_.isEmpty(item.refs)) {
          let refs = item.refs.map(ref => (
            <div key={ ref.id } className="ux-list-item">
              { itemRenderer(ref) }
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
        }
      }

      return listItem;
    });

    let lastDrop = null;
    if (itemOrderModel) {
      lastDrop = <ListItemDropTarget data={ data } order={ previousOrder + .5 } onDrop={ this.handleItemDrop.bind(this) }/>
    }

    //
    // Editor.
    // TODO(burdon): By default at the bottom.
    //

    let editor = null;
    if (this.state.showAdd) {
      const Editor = List.DefaultEditor;
      editor = (
        <div className="ux-list-item ux-list-editor">
          <Editor item={ this.state.editedItem }
                  onSave={ this.handleItemSave.bind(this) }
                  onCancel={ this.handleItemCancel.bind(this) }/>
        </div>
      );
    }

    let className = 'ux-list ' + (this.props.className || '');
    return (
      <div className={ className }>
        { rows }
        { lastDrop }
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

    let icon = props.icon;
    if (icon.startsWith('http') || icon.startsWith('/')) {
      return (
        <i className="ux-icon ux-icon-img">
          <img src={ icon }/>
        </i>
      )
    } else {
      return (
        <i className="ux-icon">{ props.icon }</i>
      );
    }
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

// TODO(burdon): Should be broader than List (i.e., on Board, etc.)
export const DragDropList = DragDropContext(HTML5Backend)(List);
