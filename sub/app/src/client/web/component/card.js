//
// Copyright 2016 Minder Labs.
//

import React from 'react';

/**
 * Card wrapper.
 */
export class Card extends React.Component {

  static propTypes = {
    item: React.PropTypes.object.isRequired
  };

  render() {
    let { children, item } = this.props;

    return (
      <div className="ux-card">
        <div>
          <h1>{ item.title }</h1>
        </div>
        <div>
          { children }
        </div>
      </div>
    );
  }
}
