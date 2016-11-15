//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import Async from '../../util/async';

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

  constructor() {
    super(...arguments);

    this.state = {
      value: this.props.value || ''
    };

    this._timeout = Async.timeout(this.props.delay);
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
    this._timeout(() => {
      this.props.onTextChange && this.props.onTextChange(this.state.value);
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
             className="app-textbox"
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
