//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';

import { Async } from 'minder-core';

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
    value:          React.PropTypes.string
  };

  static defaultProps = {
    delay: 100
  };

  static initialState(props) {
    return {
      value: props.value || ''
    }
  }

  constructor() {
    super(...arguments);

    this.state = TextBox.initialState(this.props);

    this._timeout = Async.timeout(this.props.delay);
  }

  componentWillReceiveProps(nextProps) {
    this.state = TextBox.initialState(nextProps);
  }

  get value() {
    return this.state.value;
  }

  set value(value) {
    this.setState({
      value: value
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
        this.props.onEnter && this.props.onEnter(this.value);
        break;
      }

      // ESCAPE
      case 27: {
        this.props.onCancel && this.props.onCancel(this.value);
        break;
      }
    }
  }

  handleFocusChange(state) {
    this.props.onFocusChange && this.props.onFocusChange(state);
  }

  render() {
    let className = _.join([this.props.className, 'app-textbox'], ' ');

    return (
      <input ref="input"
             type="text"
             className={ className }
             autoFocus={ this.props.autoFocus ? 'autoFocus' : '' }
             value={ this.state.value }
             placeholder={ this.props.placeholder }
             onChange={ this.handleTextChange.bind(this) }
             onKeyDown={ this.handleKeyDown.bind(this) }
             onFocus={ this.handleFocusChange.bind(this, true) }
             onBlur={ this.handleFocusChange.bind(this, false) }/>
    );
  }
}
