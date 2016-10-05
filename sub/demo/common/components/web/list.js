//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import './list.less';

/**
 * List component.
 */
export class ListView extends React.Component {

  // TODO(burdon): Create native equivalent.

  constructor(props, context) {
    super(props, context);
    console.assert(props.model);

    this.state = {
      items: []
    };

    this.props.model.setListener((result) => {
      this.setState({
        items: result['items'] || []
      });
    });
  }

  render() {
    let rows = this.state.items.map((item) => {
      return (
        <tr key={ item.id }>
          <td>{ item.id }</td>
          <td>{ item.version }</td>
          <td>{ item.title }</td>
        </tr>
      );
    });

    return (
      <div className="app-list">
        <table>
          <tbody>
            { rows }
          </tbody>
        </table>
      </div>
    );
  }
}
