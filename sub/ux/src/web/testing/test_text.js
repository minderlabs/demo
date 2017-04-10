//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { TextBox } from '../../index';

/**
 * Test List.
 */
export default class TestText extends React.Component {

  static WORDS = [
    'Apple',
    'Banana',
    'Cherry'
  ];

  state = {
    idx: 0
  };

  handleRefresh() {
    setTimeout(() => {
      this.forceUpdate();
    }, 1000);
  }

  handleChange() {
    setTimeout(() => {
      this.setState({
        idx: this.state.idx === TestText.WORDS.length - 1 ? 0 : this.state.idx + 1
      });
    }, 1000);
  }

  render() {
    let text = TestText.WORDS[this.state.idx];

    // When should the textbox be updated? Textbox itself can't know.
    //

    return (
      <div>
        <TextBox autoFocus={ true } value={ text }/>

        <button onClick={ this.handleRefresh.bind(this) }>Refresh</button>
        <button onClick={ this.handleChange.bind(this) }>Change</button>
      </div>
    )
  }
}
