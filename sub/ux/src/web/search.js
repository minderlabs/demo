//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { TextBox } from './textbox';

import './search.less';

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
    this.props.onSearch(this.refs.text.value);
  }

  handleCancel(event) {
    this.refs.text.value = '';
  }

  render() {
    let { className, value } = this.props;

    return (
      <div className={ _.join([className, 'ux-search', 'ux-row'], ' ') }>
        <TextBox ref="text"
                 className='ux-expand'
                 autoFocus={ true }
                 placeholder='Search... [@type] [#label]'
                 value={ value }
                 onCancel={ this.handleCancel.bind(this) }
                 onChange={ this.handleSearch.bind(this) }/>

        <i className="ux-icon" onClick={ this.handleSearch.bind(this) }>search</i>
      </div>
    );
  }
}
