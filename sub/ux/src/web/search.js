//
// Copyright 2016 Minder Labs.
//

import React from 'react';

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

  handleSearch(event) {
    this.props.onSearch(this.refs.text.value);
  }

  handleCancel(event) {
    this.refs.text.value = '';
  }

  render() {
    let className = _.join([this.props.className, 'ux-search', 'ux-row'], ' ');

    return (
      <div className={ className }>
        <TextBox ref="text"
                 className='ux-expand'
                 autoFocus={ true }
                 placeholder='Search... [@type] [#label]'
                 value={ this.props.value}
                 onCancel={ this.handleCancel.bind(this) }
                 onChange={ this.handleSearch.bind(this) }
        />

        <i className="ux-icon" onClick={ this.handleSearch.bind(this) }>search</i>
      </div>
    );
  }
}
