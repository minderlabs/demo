//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';

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
      if (event.keyCode === keyCode) {
        callback(event.target.value);
      }
    }
  }

  static propTypes = {
    autoFocus:      PropTypes.bool,
    className:      PropTypes.string,
    delay:          PropTypes.number,
    onCancel:       PropTypes.func,
    onChange:       PropTypes.func,
    onEnter:        PropTypes.func,
    onFocusChange:  PropTypes.func,
    onKeyDown:      PropTypes.func,
    placeholder:    PropTypes.string,
    value:          PropTypes.string,
    clickToEdit:    PropTypes.bool,
    notEmpty:       PropTypes.bool
  };

  static defaultProps = {
    delay: 100
  };

  constructor() {
    super(...arguments);

    // Maintain the current value so that componentWillReceiveProps doesn't overwrite current edits.
    this._currentValue = this.props.value;

    this.state = {
      readOnly: false,
      value: this._currentValue
    };

    this._delay = Async.delay(this.props.delay);
  }

  /**
   * Update state when parent is re-rendered (e.g., input is reused across different detail views).
   * https://facebook.github.io/react/docs/react-component.html#componentwillreceiveprops
   */
  componentWillReceiveProps(nextProps) {
    let { value } = nextProps;
    if (this.state.readOnly || value !== this._currentValue) {
      this._currentValue = value;
    } else {
      value = this.state.value;
    }

    this.setState({
      readOnly: nextProps.clickToEdit,
      value
    });
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
    this.refs.input && this.refs.input.focus();
  }

  /**
   * Trigger after delay.
   * @param now Do it immediately.
   */
  fireTextChange(now=false) {
    this._delay(() => {
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
          readOnly: true,
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
        this.focus();
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
               value={ value || '' }
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
