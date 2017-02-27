//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import BaseLayout from '../layout/layout';

import './split.less';

/**
 * Split page layout.
 *
 * https://developer.android.com/guide/practices/tablets-and-handsets.html
 */
export class SplitLayout extends React.Component {

  static propTypes = {
    navbar: React.PropTypes.object.isRequired,
  };

  render() {
    let { navbar, children, finder } = this.props;

    return (
      <BaseLayout navbar={ navbar }>
        <div className="app-split-layout">
          <div className="app-finder-panel">
            { finder }
          </div>
          <div className="app-main-panel">
            { children }
          </div>
        </div>
      </BaseLayout>
    );
  }
}
