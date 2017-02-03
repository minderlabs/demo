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
        <div className="ux-card-header">
          <h1>{ item.title }</h1>
        </div>
        <div className="ux-card-body">
          { children }
        </div>
      </div>
    );
  }
}
