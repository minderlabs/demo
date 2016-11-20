//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';

import TextBox from './textbox';

import './picker.less';

/**
 * Compact view of an Item.
 */
class Picker extends React.Component {

  // TODO(burdon): Allow text input while paging.

  static propTypes = {
    className:  React.PropTypes.string,
    viewer:     React.PropTypes.object.isRequired,
    filter:     React.PropTypes.object.isRequired,
    value:      React.PropTypes.string
  };

  constructor() {
    super(...arguments);

    this.state = {
      showPopup: false
    };

    this._selected = null;
    this._focusTimeout = null;
  }

  handleListKeyDown(event) {
    switch (event.keyCode) {

      // ENTER:
      case 13: {
        if (this._selected) {
          this.handleItemSelect(this._selected);
        }
        break;
      }

      // ESCAPE
      case 27: {
        event.stopPropagation(); // Don't reset input.
        this.refs.textbox.focus();
        break;
      }

      // UP
      case 38: {
        event.preventDefault(); // Don't scroll.
        let prev = $(event.target).prev();
        if (prev[0]) {
          prev.focus();
        } else {
          this.refs.textbox.focus();
        }
        break;
      }

      // DOWN
      case 40: {
        event.preventDefault(); // Don't scroll.
        let next = $(event.target).next();
        next.focus();
        break;
      }
    }
  }

  handleTextKeyDown(event) {
    switch (event.keyCode) {

      // DOWN
      case 40: {
        // Focus first item.
        $(this.refs.items).find('input:first').focus();
        break;
      }
    }
  }

  /**
   * Show/hide popup.
   * @param show
   */
  showPopup(show) {
    this._focusTimeout && clearTimeout(this._focusTimeout);
    this._focusTimeout = setTimeout(() => {
      this.setState({
        showPopup: show
      });
    }, 0); // Must be async to give all focus events to fire.
  }

  handleTextFocusChange(state) {
    this.showPopup(state);
  }

  handleTextChange(text) {
    this.props.relay.setVariables({
      // Preserve type.
      filter: _.assign({}, this.props.relay.variables.filter, {
        text: text
      })
    });
  }

  handleItemSelect(item) {
    this.refs.textbox.value = item.title;
    this.props.onSelect && this.props.onSelect(item);
    this.setState({
      showPopup: false
    });
  }

  handleItemFocusChange(item, state) {
    this._selected = state && item;
    this.showPopup(state);
  }

  render() {
    let { viewer } = this.props;

    // TODO(burdon): Define props.
    let placeholder = `Search ${this.props.filter.type}...`;

    let rows = viewer.items.edges.map((edge) => {
      return (
        <input key={ edge.node.id }
               readOnly="readOnly"
               defaultValue={ edge.node.title }
               onKeyDown={ this.handleListKeyDown.bind(this) }
               onFocus={ this.handleItemFocusChange.bind(this, edge.node, true) }
               onBlur={ this.handleItemFocusChange.bind(this, edge.node, false) }
               onClick={ this.handleItemSelect.bind(this, edge.node) }/>
      );
    });

    let className = _.join([this.props.className, 'app-picker'], ' ');

    return (
      <div className={ className }>
        <div>
          <TextBox ref="textbox"
                   value={ this.props.value }
                   placeholder={ placeholder }
                   onKeyDown={ this.handleTextKeyDown.bind(this) }
                   onTextChange={ this.handleTextChange.bind(this) }
                   onFocusChange={ this.handleTextFocusChange.bind(this) }/>
        </div>

        <div ref="items" className="app-picker-popup" style={ {'display': this.state.showPopup ? 'block' : 'none' } }>
          <div>
            { rows }
          </div>
        </div>
      </div>
    );
  }
}
