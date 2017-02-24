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

    clickToEdit:    React.PropTypes.bool
  };

  static defaultProps = {
    delay: 100
  };

  state = {
    readOnly: false
  };

  constructor() {
    super(...arguments);

    this._timeout = Async.timeout(this.props.delay);
  }

  // TODO(burdon): Factor out.
  static diffValue(currentState, nextProps, properties) {
    let newState = {};

    _.each(properties, (propKey, stateKey) => {
      let currentValue = _.get(currentState, stateKey);
      let nextValue = _.get(nextProps, propKey);

      if (currentValue != nextValue) {
        _.set(newState, stateKey, nextValue);
      }
    });

    return newState;
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
    this.setState(TextBox.diffValue(this.state, nextProps, {
      value:      'value',
      readOnly:   'clickToEdit'
    }));
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
        this.props.onEnter && this.props.onEnter(this.value, event);
        if (this.props.clickToEdit) {
          this.setState({
            readOnly: true
          });
        }
        break;
      }

      // ESCAPE
      case 27: {
        this.props.onCancel && this.props.onCancel(this.value, event);
        if (this.props.clickToEdit) {
          this.setState({
            readOnly: true
          });
        }
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

    return (
      readOnly ?
        <div onClick={ this.handleClickToEdit.bind(this) }>{ value }</div> :
        <input ref="input"
               type="text"
               spellCheck={ false }
               className={ DomUtil.className('ux-textbox', className) }
               autoFocus={ autoFocus ? 'autoFocus' : '' }
               value={ value || '' }
               placeholder={ placeholder }
               onChange={ this.handleTextChange.bind(this) }
               onKeyDown={ this.handleKeyDown.bind(this) }
               onFocus={ this.handleFocusChange.bind(this, true) }
               onBlur={ this.handleFocusChange.bind(this, false) }/>
    );
  }
}
