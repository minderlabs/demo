//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { DomUtil } from 'minder-core';

import { TextBox } from './textbox';

/**
 * Search bar.
 */
export class SearchBar extends React.Component {

  static propTypes = {
    className:  React.PropTypes.string,
    onSearch:   React.PropTypes.func.isRequired,
    value:      React.PropTypes.string
  };

  reset() {
    this.value = '';
  }

  set value(value) {
    this.refs.text.value = value;
  }

  handleSearch(event) {
    console.log('::::::::::::', this.refs.text.value);
    this.props.onSearch(this.refs.text.value);
  }

  handleClear(event) {
    this.refs.text.value = '';
    this.refs.text.focus();
  }

  render() {
    let { value, className } = this.props;

    return (
      <div className={ DomUtil.className(className, 'ux-search', 'ux-row') }>
        <TextBox ref="text"
                 className='ux-expand'
                 autoFocus={ true }
                 placeholder='Search...'
                 value={ value }
                 onCancel={ this.handleClear.bind(this) }
                 onChange={ this.handleSearch.bind(this) }/>

        <i className="ux-icon ux-search-icon" onClick={ this.handleSearch.bind(this) }>search</i>
        <i className="ux-icon ux-search-icon" onClick={ this.handleClear.bind(this) }>clear</i>
      </div>
    );
  }
}
