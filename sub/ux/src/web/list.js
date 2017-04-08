//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { DomUtil, ItemUtil, MutationUtil } from 'minder-core';

import { TextBox } from './textbox';
import { ItemDragSource, ItemDropTarget, DragOrderModel } from './dnd';

import './list.less';

//
// Drag and Drop wrappers.
//

const ListItemDragSource = ItemDragSource('ListItem');
const ListItemDropTarget = ItemDropTarget('ListItem');

/**
 * List is a super flexible component for rendering items.
 *
 * Lists can specify a custom itemRenderer that creates ListItem components.
 *
 * Inline components within each ListItem receive the List's context to access the data item,
 * and to handle events (e.g., selection, update).
 */
export class List extends React.Component {

  //
  // Default renderers.
  //

  static DefaultItemEditor = (item) => {
    return (
      <ListItemEditor item={ item }>
        <ListItem.Edit field="title"/>
        <ListItem.EditorButtons/>
      </ListItemEditor>
    );
  };

  static DefaultItemRenderer = (item) => {
    return (
      <ListItem item={ item }>
        <ListItem.Text value={ item.title }/>
      </ListItem>
    );
  };

  static DefaultEditableItemRenderer = (item) => {
    return (
      <ListItem item={ item }>
        <ListItem.Text value={ item.title }/>
        <ListItem.EditButton/>
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

  //
  // Context passed to ListItem and inline widgets.
  //
  static childContextTypes = {
    onItemSelect:       React.PropTypes.func,
    onItemEdit:         React.PropTypes.func,
    onItemUpdate:       React.PropTypes.func,
    onItemCancel:       React.PropTypes.func
  };

  static propTypes = {
    data:               React.PropTypes.string,     // Custom data/label.

    className:          React.PropTypes.string,
    highlight:          React.PropTypes.bool,

    items:              React.PropTypes.arrayOf(React.PropTypes.object),
    groupedItems:       React.PropTypes.arrayOf(React.PropTypes.object),

    itemClassName:      React.PropTypes.string,
    itemEditor:         React.PropTypes.func,
    itemRenderer:       React.PropTypes.func,
    itemOrderModel:     React.PropTypes.object,     // Order model for drag and drop.

    onItemUpdate:       React.PropTypes.func,
    onItemSelect:       React.PropTypes.func,
    onItemDrop:         React.PropTypes.func
  };

  static defaultProps = {
    highlight: true,

    itemEditor:   List.DefaultItemEditor,
    itemRenderer: List.DefaultItemRenderer
  };

  state = {
    items: this.props.items || [],

    itemEditor:   this.props.itemEditor   || List.DefaultItemEditor,
    itemRenderer: this.props.itemRenderer || List.DefaultItemRenderer,

    addItem: false,     // { boolean }
    editItem: null      // { string:ID }
  };

  // TODO(burdon): Why is this part of state?
  componentWillReceiveProps(nextProps) {
    this.setState({
      items: nextProps.items || []
    });
  }

  getChildContext() {
    return {
      onItemSelect: this.handleItemSelect.bind(this),
      onItemEdit:   this.handleItemEdit.bind(this),
      onItemUpdate: this.handleItemUpdate.bind(this),
      onItemCancel: this.handleItemCancel.bind(this)
    };
  }

  set itemEditor(itemEditor) {
    this.setState({
      itemEditor: itemEditor || List.DefaultItemEditor
    });
  }

  set itemRenderer(itemRenderer) {
    this.setState({
      itemRenderer: itemRenderer || List.DefaultItemRenderer
    });
  }

  /**
   * Set editor to add new item.
   */
  addItem() {
    if (!this.props.onItemUpdate) {
      console.warn('Read-only list.');
      return;
    }

    // TODO(burdon): Set focus on editor.
    if (!this.state.addItem) {
      this.setState({
        addItem: true,
        editItem: null
      });
    }
  }

  /**
   * Edit item for given ID.
   * @param {string} id
   */
  editItem(id=undefined) {
    if (!this.props.onItemUpdate) {
      console.warn('Read-only list.');
      return;
    }

    this.setState({
      addItem: false,
      editItem: id
    });
  }

  /**
   * Call the List's onItemSelect callback.
   * @param {Item} item Item to select or null to cancel.
   */
  handleItemSelect(item) {
    // TODO(burdon): Provide selection model.
    this.props.onItemSelect && this.props.onItemSelect(item);
  }

  /**
   * Set edit mode.
   * @param id
   */
  handleItemEdit(id) {
    this.editItem(id);
  }

  /**
   * Call the List's onItemUpdate callback with the given mutations.
   * @param {Item} item Null if create.
   * @param mutations
   */
  handleItemUpdate(item, mutations) {
    console.assert(mutations);
    console.assert(this.props.onItemUpdate);

    this.props.onItemUpdate(item, mutations);

    this.handleItemCancel();
  }

  /**
   * Cancel adding or editing item.
   */
  handleItemCancel() {
    this.setState({
      addItem: false,
      editItem: null
    });
  }

  /**
   * Handle item drop.
   * @param dropItem
   * @param data
   * @param order
   */
  handleItemDrop(dropItem, data, order) {
    console.assert(dropItem && dropItem.id);

    // Update the order.
    let changes = this.props.itemOrderModel.setOrder(this.props.items, dropItem.id, data, order);

    // Repaint and notify parent.
    this.forceUpdate(() => {
      this.props.onItemDrop(this.props.data, dropItem.id, changes);
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

    // NOTE: data is a user-label to identify the list.
    let { itemClassName, itemOrderModel, groupedItems, data } = this.props;
    let { items, itemRenderer, itemEditor, addItem, editItem } = this.state;

    //
    // Group/merge items.
    //

    if (groupedItems) {

      // Create Set of all grouped items.
      let ids = new Set();
      _.each(groupedItems, groupedItem => {
        ids.add(groupedItem.id);
        _.each(groupedItem.groups, group => {
          _.each(group.ids, id => ids.add(id));
        });
      });

      // Create ordered items.
      let items2 = _.filter(items, item => {
        if (ids.has(item.id)) {
          // TODO(burdon): Add grandchildren?
          return _.findIndex(groupedItems, groupedItem => groupedItem.id === item.id) !== -1;
        } else {
          return true;
        }
      });

      // TODO(burdon): ???
//    console.log('===', _.map(items2, item => item.title));
    }

//  console.log('########', _.map(items, item => item.title));

    //
    // Sort items by order model.
    //

    if (itemOrderModel) {
      items = itemOrderModel.getOrderedItems(items);
    }

    //
    // Rows.
    //

    // Debug-only.
    let keyMap = new Map();

    let previousOrder = 0;
    let rows = _.map(items, item => {
      console.assert(item && item.type && item.id, 'Invalid Item: ' + JSON.stringify(item, 0, 2));

      let itemKey = item.id;
      if (keyMap.get(itemKey)) {
        console.warn('Repeated item [' + itemKey + ']: ' +
          JSON.stringify(_.pick(item, ['type', 'title'])) + ' == ' +
          JSON.stringify(_.pick(keyMap.get(itemKey), ['type', 'title'])));
      } else {
        keyMap.set(itemKey, item);
      }

      // Primary item.
      let listItem;
      if (item.id === editItem) {
        listItem = (
          <div key={ itemKey } className={ DomUtil.className('ux-list-item', 'ux-list-editor', itemClassName) }>
            { itemEditor(item, this) }
          </div>
        );
      } else {
        listItem = (
          <div key={ itemKey } className={ DomUtil.className('ux-list-item', itemClassName) }>
            { itemRenderer(item, this) }
          </div>
        );
      }

      // If supports dragging, wrap with drag container.
      // TODO(burdon): Drop target isn't necessarily required on list.
      if (itemOrderModel) {
        // Get the order from the state (if set); otherwise invent one.
        let actualOrder = itemOrderModel.getOrder(item.id);
        let itemOrder = actualOrder || previousOrder + 1;

        // Calculate the dropzone order (i.e., midway between the previous and current item).
        let dropOrder = (previousOrder === 0) ? previousOrder : DragOrderModel.split(previousOrder, itemOrder);

        // Drop zone above each item.
        listItem = (
          <ListItemDropTarget key={ itemKey }
                              data={ data }
                              order={ dropOrder }
                              onDrop={ this.handleItemDrop.bind(this) }>

            <ListItemDragSource data={ item.id } order={ actualOrder }>
              { listItem }
            </ListItemDragSource>
          </ListItemDropTarget>
        );

        previousOrder = itemOrder;
      }

      return listItem;
    });

    // Drop zone at the bottom of the list.
    let lastDropTarget = null;
    if (itemOrderModel) {
      lastDropTarget = <ListItemDropTarget data={ data }
                                           order={ previousOrder + .5 }
                                           onDrop={ this.handleItemDrop.bind(this) }/>
    }

    //
    // Editor.
    //

    let editor;
    if (addItem) {
      editor = (
        <div className={ DomUtil.className('ux-list-item', 'ux-list-editor', itemClassName) }>
          { itemEditor(null, this) }
        </div>
      );
    }

    //
    // Layout.
    //

    // TODO(burdon): Editor should be in separate div (not part of scroll container).
    let className = DomUtil.className('ux-list', this.props.className, this.props.highlight && 'ux-list-highlight');
    return (
      <div className={ className }>
        { rows }
        { lastDropTarget }

        { editor }
      </div>
    );
  }
}

//
// Context for child <ListItem/> components.
// Enable sub-components to access the item and list handlers.
//
const ListItemChildContextTypes = {

  // Item.
  item: React.PropTypes.object,

  // ListItem component.
  listItem: React.PropTypes.object,

  // Inherited from List component.
  onItemSelect: React.PropTypes.func,
  onItemEdit:   React.PropTypes.func,
  onItemUpdate: React.PropTypes.func,
  onItemCancel: React.PropTypes.func
};

/**
 * List item component (and sub-components).
 *
 * const customItemRenderer = (item) => (
 *   <ListItem item={ item }>
 *     <ListItem.Text value={ item.title }/>
 *   </ListItem>
 * )
 */
export class ListItem extends React.Component {

  /**
   * Creates an inline ListItem widget with the context declarations.
   * @param render
   * @returns {*}
   */
  static createInlineComponent(render) {
    render.contextTypes = ListItemChildContextTypes;
    return render;
  }

  /**
   * <ListItem.Debug/>
   */
  static Debug = ListItem.createInlineComponent((props, context) => {
    let { item } = context;
    let { fields } = props;

    let obj = fields ? _.pick(item, fields) : item;
    return (
      <div className="ux-debug">{ JSON.stringify(obj, null, 1) }</div>
    );
  });

  /**
   * <ListItem.Icon/>
   */
  static Icon = ListItem.createInlineComponent((props, context) => {
    let { item } = context;

    let attrs = {};
    if (props.onClick) {
      attrs.onClick = () => { props.onClick(item); }
    }

    let icon = props.icon || item.icon || '';
    if (icon.startsWith('http') || icon.startsWith('/')) {
      return (
        <i className="ux-icon ux-icon-img" {...attrs}>
          <img src={ icon }/>
        </i>
      );
    } else {
      return (
        <i className="ux-icon" {...attrs}>{ icon }</i>
      );
    }
  });

  /**
   * <ListItem.Favorite/>
   */
  static Favorite = ListItem.createInlineComponent((props, context) => {
    let { item } = context;

    // TODO(burdon): Generalize to toggle any icon.
    let set = _.indexOf(item.labels, '_favorite') !== -1;
    const handleToggleLabel = () => {
      context.onItemUpdate(item, [
        MutationUtil.createLabelMutation('_favorite', !set)
      ]);
    };

    return (
      <i className="ux-icon" onClick={ handleToggleLabel }>{ set ? 'star' : 'star_border' }</i>
    );
  });

  /**
   * <ListItem.Text value={ item.title } select={ true }/>
   */
  static Text = ListItem.createInlineComponent((props, context) => {
    let { item, onItemSelect } = context;
    let { value, select=true } = props;

    let className = DomUtil.className('ux-expand', 'ux-text', select && 'ux-selector');
    let attrs = {};
    if (select) {
      // NOTE: Use onMouseDown instead of onClick (happens before onBlur for focusable components).
      attrs = {
        onMouseDown: onItemSelect.bind(null, item)
      }
    }

    return (
      <div className={ className } {...attrs}>{ value }</div>
    );
  });

  /**
   * <ListItem.Edit field="title"/>
   */
  static Edit = ListItem.createInlineComponent((props, context) => {
    let { listItem, item, onItemUpdate, onItemCancel } = context;
    let { field } = props;

    // Stateless functions can't use ref directly, but we can make a local reference.
    let textbox;

    const handleSave = () => {
      let value = textbox.value;
      if (!value) {
        return onItemCancel();
      }

      onItemUpdate(item, [
        MutationUtil.createFieldMutation(field, 'string', value)
      ]);
    };

    const handleCancel = () => { onItemCancel(); };

    // Sets callback (e.g., when <ListItem.EditorButtons/> saves).
    listItem.setOnSave(() => {
      handleSave();
    });

    let value = _.get(item, field);

    return (
      <TextBox ref={ el => (textbox = el) }
               className="ux-expand"
               autoFocus={ true }
               value={ value }
               onEnter={ handleSave }
               onCancel={ handleCancel }/>
    );
  });

  /**
   * <ListItem.EditorButtons/>
   */
  static EditorButtons = ListItem.createInlineComponent((props, context) => {
    let { listItem, onItemCancel } = context;

    const handleSave = () => {
      listItem.save();
    };

    const handleCancel = () => { onItemCancel(); };

    return (
      <div>
        <i className="ux-icon ux-icon-action ux-icon-save" onClick={ handleSave }/>
        <i className="ux-icon ux-icon-action ux-icon-cancel" onClick={ handleCancel }/>
      </div>
    )
  });

  /**
   * <ListItem.EditButton/>
   */
  static EditButton = ListItem.createInlineComponent((props, context) => {
    let { item, onItemEdit } = context;

    const handleEdit = () => {
      onItemEdit(item.id);
    };

    return (
      <div>
        <i className="ux-icon ux-icon-action ux-icon-hover ux-icon-edit" onClick={ handleEdit }/>
      </div>
    )
  });

  /**
   * <ListItem.DeleteButton/>
   */
  static DeleteButton = ListItem.createInlineComponent((props, context) => {
    let { item } = context;

    const handleDelete = () => {
      context.onItemUpdate(item, [
        MutationUtil.createDeleteMutation(_.findIndex(item.labels, '_deleted') === -1)
      ]);
    };

    return (
      <i className="ux-icon ux-icon-delete" onClick={ handleDelete }>cancel</i>
    );
  });

  //
  // Provided by renderer.
  //
  static propTypes = {
    item: React.PropTypes.object,
    className: React.PropTypes.string,
  };

  //
  // From parent <List/> control.
  //
  static contextTypes = {
    onItemSelect: React.PropTypes.func.isRequired,
    onItemUpdate: React.PropTypes.func.isRequired,
    onItemCancel: React.PropTypes.func.isRequired
  };

  //
  // To child <ListItem/> components.
  // Enable sub-components to access the item and handlers.
  //
  static childContextTypes = ListItemChildContextTypes;

  constructor() {
    super();

    this._onSave = null;
  }

  setOnSave(callback) {
    this._onSave = callback;
  }

  save() {
    this._onSave && this._onSave();
  }

  getChildContext() {
    return {
      item: this.props.item,
      listItem: this
    }
  }

  render() {
    let { children, className } = this.props;

    return (
      <div className={ DomUtil.className('ux-row', 'ux-data-row', className) }>
        { children }
      </div>
    );
  }
}

/**
 * ListItem editor.
 */
export class ListItemEditor extends ListItem {

  render() {
    let { children, className } = this.props;

    return (
      <div className={ DomUtil.className('ux-row', 'ux-data-row', className) }>
        { children }
      </div>
    );
  }
}

export const DragDropList = DragDropContext(HTML5Backend)(List);
