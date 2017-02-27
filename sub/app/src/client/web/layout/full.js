//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import BaseLayout from '../layout/layout';

import './full.less';

/**
 * Full screen layout.
 *
 * https://developer.android.com/guide/practices/tablets-and-handsets.html
 */
export class FullLayout extends React.Component {

  static propTypes = {
    navbar: React.PropTypes.object.isRequired,
  };

  render() {
    let { search, navbar, children, className } = this.props;

    return (
      <BaseLayout navbar={ navbar } className={ className }>
        <div className="app-full-layout">
          { children }
        </div>
      </BaseLayout>
    );
  }
}
