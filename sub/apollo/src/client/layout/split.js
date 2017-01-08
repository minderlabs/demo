//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import BaseLayout from '../layout/base';

import './split.less';

/**
 * Split page layout.
 *
 * https://developer.android.com/guide/practices/tablets-and-handsets.html
 */
export class SplitLayout extends React.Component {

  render() {
    let { children, nav } = this.props;

    return (
      <BaseLayout>
        <div className="app-split-layout">
          <div className="app-nav-panel">
            { nav }
          </div>
          <div className="app-main-panel">
            { children }
          </div>
        </div>
      </BaseLayout>
    );
  }
}
