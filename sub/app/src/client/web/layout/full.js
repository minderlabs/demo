//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import BaseLayout from '../layout/base';

import './full.less';

/**
 * Full screen layout.
 *
 * https://developer.android.com/guide/practices/tablets-and-handsets.html
 */
export class FullLayout extends React.Component {

  static propTypes = {
    search: React.PropTypes.bool
  };

  static defaultProps = {
    search: true
  };

  render() {
    let { children, search, className } = this.props;

    return (
      <BaseLayout search={ search } className={ className }>
        <div className="app-full-layout">
          { children }
        </div>
      </BaseLayout>
    );
  }
}
