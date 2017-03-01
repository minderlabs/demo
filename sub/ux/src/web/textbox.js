//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { Async, DomUtil } from 'minder-core';

/**
 * Text box.
 */
export class TextBox extends React.Component {

  /**
   * Returns key filter
   *
   * @param keyCode
   * @param callback Callback invoked with textbox value.
   * @returns {function(*)}
   */
  static filter(keyCode, callback) {
    return (event) => {
      if (event.keyCode == keyCode) {
        callback(event.target.value);
      }
    }
  }

  static propTypes = {
    autoFocus:      React.PropTypes.bool,
    className:      React.PropTypes.string,
    delay:          React.PropTypes.number,
    onCancel:       React.PropTypes.func,
    onChange:       React.PropTypes.func,
    onEnter:        React.PropTypes.func,
    onFocusChange:  React.PropTypes.func,
    onKeyDown:      React.PropTypes.func,
    placeholder:    React.PropTypes.string,
    value:          React.PropTypes.string,
    clickToEdit:    React.PropTypes.bool,
    notEmpty:       React.PropTypes.bool
  };

  static defaultProps = {
    delay: 100
  };

  state = {
    value: '',
    readOnly: false
  };

  constructor() {
    super(...arguments);

    this._timeout = Async.timeout(this.props.delay);
  }

  // TODO(burdon): Colors, pointer, etc.
  // TODO(burdon): Mutation in layout.
  // TODO(burdon): Center text (layout).
  // TODO(burdon): Esc to cancel.
  // TODO(burdon): Revert value if (trim) empty text.

  /**
   * Update state when parent is re-rendered (e.g., input is reused across different detail views).
   * https://facebook.github.io/react/docs/react-component.html#componentwillreceiveprops
   */
  componentWillReceiveProps(nextProps) {
    let state = {
      readOnly: nextProps.clickToEdit
    };

    if (this.state.readOnly) {
      state.value = nextProps.value || '';
    }

    this.setState(state);
  }

  get value() {
    return this.state.value;
  }

  set value(value) {
    this.setState({
      value: value || ''
    }, () => {
      this.fireTextChange(true);
    });
  }

  focus() {
    this.refs.input.focus();
  }

  /**
   * Trigger after delay.
   * @param now Do it immediately.
   */
  fireTextChange(now=false) {
    this._timeout(() => {
      this.props.onChange && this.props.onChange(this.state.value);
    }, now);
  }

  handleTextChange(event) {
    this.setState({
      value: event.target.value
    }, () => {
      this.fireTextChange();
    });
  }

  handleKeyDown(event) {
    this.props.onKeyDown && this.props.onKeyDown(event);

    switch (event.keyCode) {

      // ENTER
      case 13: {
        this.fireTextChange(true);
        let text = this.value.trim();
        if (this.props.notEmpty && !text) {
          break;
        }

        this.setState({
          readOnly: this.props.clickToEdit
        }, () => {
          this.props.onEnter && this.props.onEnter(this.value, this, event);
        });
        break;
      }

      // ESCAPE
      case 27: {
        this.setState({
          value: this.props.value,
          readOnly: this.props.clickToEdit
        }, () => {
          this.props.onCancel && this.props.onCancel(this.props.value, event);
        });
        break;
      }
    }
  }

  handleFocusChange(state) {
    this.props.onFocusChange && this.props.onFocusChange(state);
  }

  handleClickToEdit() {
    if (this.props.clickToEdit) {
      this.setState({
        readOnly: false
      }, () => {
        this.refs.input.focus();
      });
    }
  }

  render() {
    let { autoFocus, className, placeholder } = this.props;
    let { readOnly, value } = this.state;

    if (readOnly) {
      return (
        <div className={ DomUtil.className('ux-textbox', 'ux-readonly', className) }
             onClick={ this.handleClickToEdit.bind(this) }>{ value }</div>
      );
    } else {
      // TODO(burdon): Buttons.
      return (
        <input ref="input"
               type="text"
               value={ value }
               className={ DomUtil.className('ux-textbox', className) }
               spellCheck={ false }
               autoFocus={ autoFocus ? 'autoFocus' : '' }
               placeholder={ placeholder }
               onChange={ this.handleTextChange.bind(this) }
               onKeyDown={ this.handleKeyDown.bind(this) }
               onFocus={ this.handleFocusChange.bind(this, true) }
               onBlur={ this.handleFocusChange.bind(this, false) }/>
      );
    }
  }
}
