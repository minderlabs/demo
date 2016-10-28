//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

/**
 * Text box.
 */
export default class TextBox extends React.Component {

  static propTypes = {
    value: React.PropTypes.string,
    delay: React.PropTypes.number
  };

  static defaultProps = {
    delay: 100
  };

  constructor(props, context) {
    super(props, context);

    this.state = {
      value: this.props.value || ''
    };

    this._timeout = null;
  }

  get value() {
    return this.state.value;
  }

  set value(value) {
    this.setState({
      value: value
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
    this._timeout && clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      this._timeout = null;
      this.props.onTextChange && this.props.onTextChange(this.state.value);
    }, now ? 0 : this.props.delay);
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
        break;
      }

      // ESCAPE
      case 27: {
        this.setState({
          value: ''
        }, () => {
          this.fireTextChange(true);
        });
        break;
      }
    }
  }

  handleFocusChange(state) {
    this.props.onFocusChange && this.props.onFocusChange(state);
  }

  render() {
    return (
      <input ref="input"
             type="text"
             value={ this.state.value }
             placeholder={ this.props.placeholder }
             onChange={ this.handleTextChange.bind(this) }
             onKeyDown={ this.handleKeyDown.bind(this) }
             onFocus={ this.handleFocusChange.bind(this, true) }
             onBlur={ this.handleFocusChange.bind(this, false) }/>
    );
  }
}
