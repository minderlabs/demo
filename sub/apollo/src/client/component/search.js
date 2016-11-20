//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';

import { TextBox } from 'minder-ux';

/**
 * Search bar.
 */
export default class Search extends React.Component {

  static propTypes = {
    className:  React.PropTypes.string,
    onSearch:   React.PropTypes.func.isRequired,
    value:      React.PropTypes.string
  };

  handleSearch(event) {
    this.props.onSearch(this.refs.text.value);
  }

  render() {
    let className = _.join([this.props.className, 'app-search', 'app-row'], ' ');

    return (
      <div className={ className }>
        <TextBox ref="text"
                 className='app-expand'
                 autoFocus={ true }
                 placeholder='Search...'
                 value={ this.props.value}
                 onChange={ this.handleSearch.bind(this) }
        />

        <button onClick={ this.handleSearch.bind(this) }>Search</button>
      </div>
    );
  }
}
