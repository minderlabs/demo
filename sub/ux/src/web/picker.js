//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { DomUtil } from 'minder-core';
import { TextBox } from './textbox';

import './picker.less';

/**
 * Compact view of an Item.
 */
export class Picker extends React.Component {

  // TODO(burdon): Allow text input while paging.

  static propTypes = {
    onTextChange:   React.PropTypes.func,
    onItemSelect:   React.PropTypes.func,
    className:      React.PropTypes.string,
    items:          React.PropTypes.array,
    value:          React.PropTypes.string
  };

  constructor() {
    super(...arguments);
    let { value:text, items } = this.props;

    this.state = {
      text,
      items,
      value: null,
      showPopup: false
    };

    this._selected = null;
    this._focusTimeout = null;
  }

  componentWillReceiveProps(nextProps) {
    let { value:text, items } = nextProps;
    this.setState({
      text,
      items
    });
  }

  get value() {
    return this.state.value;
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
        $(this.refs.popup).find('input:first').focus();
        break;
      }
    }
  }

  /**
   * Show/hide popup.
   * @param show
   */
  showPopup(show) {
    // Constrain pop-up.
    let width = $(ReactDOM.findDOMNode(this)).width();
    $(this.refs.popup).attr('width', `${width}px`);

    this._focusTimeout && clearTimeout(this._focusTimeout);
    this._focusTimeout = setTimeout(() => {
      this.setState({
        showPopup: show
      });
    }, 0); // Must be async to allow focus events to fire.
  }

  handleTextFocusChange(state) {
    this.showPopup(state);
  }

  handleTextChange(text) {
    this.props.onTextChange && this.props.onTextChange(text);
    this.setState({
      text: text
    });
  }

  handleCancel() {
    this.refs.textbox.value = '';
  }

  handleItemSelect(item) {
    this.refs.textbox.value = item.title;
    this.props.onItemSelect && this.props.onItemSelect(item);
    this.setState({
      value: item.title,
      showPopup: false
    });
  }

  handleItemFocusChange(item, state) {
    this._selected = state && item;
    this.showPopup(state);
  }

  render() {
    let { className } = this.props;
    let { text, items=[], showPopup } = this.state;

    // TODO(burdon): Default props.
    let placeholder = `Search...`;

    // TODO(burdon): Reuse List (for cursor capability).
    let rows = items.map((item) => {
      return (
        <input key={ item.id }
               type="text"
               readOnly="readOnly"
               spellCheck={ false }
               defaultValue={ item.title }
               onKeyDown={ this.handleListKeyDown.bind(this) }
               onFocus={ this.handleItemFocusChange.bind(this, item, true) }
               onBlur={ this.handleItemFocusChange.bind(this, item, false) }
               onClick={ this.handleItemSelect.bind(this, item) }/>
      );
    });

    // TODO(burdon): Pop-out of overflow: hidden (need javascript!)
    // https://css-tricks.com/popping-hidden-overflow/

    return (
      <div className={ DomUtil.className('ux-picker', className) }>
        <TextBox ref="textbox"
                 value={ text }
                 placeholder={ placeholder }
                 onCancel={ this.handleCancel.bind(this) }
                 onChange={ this.handleTextChange.bind(this) }
                 onKeyDown={ this.handleTextKeyDown.bind(this) }
                 onFocusChange={ this.handleTextFocusChange.bind(this) }/>

        <div ref="popup" className="ux-picker-popup" style={{ 'display': showPopup ? 'block' : 'none' }}>
          <div>
            { rows }
          </div>
        </div>
      </div>
    );
  }
}
