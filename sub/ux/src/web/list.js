//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import { DomUtil, MutationUtil } from 'minder-core';

import { TextBox } from './textbox';
import { ItemDragSource, ItemDropTarget, DragOrderModel } from './dnd';

import './list.less';

//
// Drag and Drop.
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

  /**
   * Render items as cards.
   * @param typeRegistry
   * @constructor
   */
  static CardRenderer = (typeRegistry) => (item) => {
    return typeRegistry.card(item)
  };

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
    // TODO(burdon): Change to class.

    handleSave() {
      let { item } = this.props;
      let title = this.refs.title.value;
      let mutations = [
        MutationUtil.createFieldMutation('title', 'string', title)
      ];
      this.props.onSave && this.props.onSave(item, mutations);
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

  //
  // Context passed to ListItem and inline widgets.
  //
  static childContextTypes = {
    mutator:      React.PropTypes.object,
    onItemSelect: React.PropTypes.func,
    onItemUpdate: React.PropTypes.func
  };

  static propTypes = {
    className:          React.PropTypes.string,
    highlight:          React.PropTypes.bool,
    data:               React.PropTypes.string,                               // Custom data.
    items:              React.PropTypes.arrayOf(React.PropTypes.object),
    itemClassName:      React.PropTypes.string,
    itemRenderer:       React.PropTypes.func,
    itemEditor:         React.PropTypes.func,
    itemOrderModel:     React.PropTypes.object,                               // Order model for drag and drop.
    mutator:            React.PropTypes.object,
    onItemUpdate:       React.PropTypes.func,
    onItemSelect:       React.PropTypes.func,
    onItemDrop:         React.PropTypes.func,
    groupBy:            React.PropTypes.bool,
    showAdd:            React.PropTypes.bool
  };

  static defaultProps = {
    highlight: true,
    itemRenderer: List.DefaultItemRenderer,
    itemEditor: List.DefaultEditor
  };

  state = {
    items: this.props.items || [],
    itemRenderer: this.props.itemRenderer || List.DefaultItemRenderer,
    itemEditor: this.props.itemEditor,
    showAdd: this.props.showAdd,
    editedItem: null
  };

  componentWillReceiveProps(nextProps) {
    this.setState({
      items: nextProps.items || []
    });
  }

  getChildContext() {
    let { mutator } = this.props;
    return {
      mutator,
      onItemSelect: this.handleItemSelect.bind(this),
      onItemUpdate: this.handleItemUpdate.bind(this)
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

  /**
   * Call the List's onItemSelect callback.
   * @param {Item} item Item to select or null to cancel.
   */
  handleItemSelect(item) {
    // TODO(burdon): Should provide selection model.
    this.props.onItemSelect && this.props.onItemSelect(item);
  }

  /**
   * Call the List's onItemUpdate callback with the given mutations.
   * @param {Item} item Null if create.
   * @param mutations
   */
  handleItemUpdate(item, mutations) {
    console.assert(mutations);
    if (!this.props.onItemUpdate) {
      console.warning('Immutable list (set onItemUpdate property).');
    } else {
      this.props.onItemUpdate && this.props.onItemUpdate(item, mutations);

      // Cancel inline editing.
      if (this.state.showAdd) {
        this.setState({
          showAdd: false,
          editedItem: null
        });
      }
    }
  }

  handleItemCancel() {
    this.setState({
      showAdd: false,
      editedItem: null
    });
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

    let itemClassName = 'ux-list-item ' + (this.props.itemClassName || '');

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
        <div key={ item.id } className={ itemClassName }>
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
            <div key={ ref.id } className={ itemClassName }>
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
    // TODO(burdon): Distinguish create/update for handleItemUpdate callback.
    //

    let editor = null;
    if (this.state.showAdd) {
      const Editor = List.DefaultEditor;
      editor = (
        <div className="ux-list-item ux-list-editor">
          <Editor item={ this.state.editedItem }
                  onSave={ this.handleItemUpdate.bind(this) }
                  onCancel={ this.handleItemCancel.bind(this) }/>
        </div>
      );
    }

    let className = DomUtil.className('ux-list', this.props.className, this.props.highlight && 'ux-list-highlight');
    return (
      <div className={ className }>
        { rows }
        { lastDrop }
        { editor }
      </div>
    );
  }
}

//
// To child <ListItem/> components.
// Enable sub-components to access the item and handlers.
//
const ListItemChildContextTypes = {
  item: React.PropTypes.object,

  // Inherit these from parent List.
  onItemSelect: React.PropTypes.func,
  onItemUpdate: React.PropTypes.func
};

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

    let icon = props.icon || item.icon || '';
    if (icon.startsWith('http')) {
      return (
        <i className="ux-icon ux-icon-img">
          <img src={ icon }/>
        </i>
      )
    } else {
      return (
        <i className="ux-icon">{ icon }</i>
      );
    }
  });

  /**
   * <ListItem.Favorite/>
   */
  static Favorite = ListItem.createInlineComponent((props, context) => {
    let { item } = context;

    // TODO(burdon): Generalize to toggle any icon.

    let set = _.indexOf(item.labels, '_favorite') != -1;
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
   * <ListItem.Title select={ true }/>
   */
  static Title = ListItem.createInlineComponent((props, context) => {
    let { item, onItemSelect } = context;
    let { select=true } = props;

    return (
      <div className="ux-expand ux-text ux-selector"
           onClick={ select && onItemSelect.bind(null, item) }>
        { item.title }
      </div>
    );
  });

  /**
   * <ListItem.Delete/>
   */
  static Delete = ListItem.createInlineComponent((props, context) => {
    let { item } = context;

    const handleDelete = () => {
      context.onItemUpdate(item, [
        MutationUtil.createDeleteMutation(_.findIndex(item.labels, '_deleted') == -1)
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
    // TODO(burdon): Highlight on/off.
    item: React.PropTypes.object.isRequired,
    className: React.PropTypes.string,
  };

  //
  // From parent <List/> control.
  //
  static contextTypes = {
    onItemSelect: React.PropTypes.func.isRequired,
    onItemUpdate: React.PropTypes.func
  };

  //
  // To child <ListItem/> components.
  // Enable sub-components to access the item and handlers.
  //
  static childContextTypes = ListItemChildContextTypes;

  getChildContext() {
    return {
      item: this.props.item
    }
  }

  // TODO(burdon): CSS remove: ux-data-row.
  render() {
    return (
      <div className={ 'ux-row ux-data-row ' + (this.props.className || '') }>
        { this.props.children }
      </div>
    );
  }
}

// TODO(burdon): Should be broader than List (i.e., on Board, etc.)
export const DragDropList = DragDropContext(HTML5Backend)(List);
