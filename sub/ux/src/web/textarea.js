//
// Copyright 2017 Minder Labs.
//

import React from 'react';

/**
 * Textarea.
 */
export class Textarea extends React.Component {

  static propTypes = {
    className: React.PropTypes.string,
    onChange: React.PropTypes.func,
    value: React.PropTypes.string
  };

  state = {};

  componentWillReceiveProps(nextProps) {
    if (nextProps.value != this.state.value) {
      this.setState({
        value: nextProps.value || ''
      });
    }
  }

  get value() {
    return this.state.value;
  }

  set value(value) {
    this.setState({
      value: value
    });
  }

  handleTextChange(event) {
    this.setState({
      value: event.target.value
    }, () => {
      this.props.onChange && this.props.onChange(this.state.value);
    });
  }

  render() {
    let { rows, className } = this.props;
    let { value } = this.state;

    return (
      <textarea className={ _.join([className, 'ux-textarea'], ' ') }
                spellCheck={ false }
                rows={ rows }
                value={ value }
                onChange={ this.handleTextChange.bind(this) }/>
    );
  }
}
