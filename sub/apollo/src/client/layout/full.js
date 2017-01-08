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

  render() {
    let { children } = this.props;

    return (
      <BaseLayout>
        <div className="app-full-layout">
          { children }
        </div>
      </BaseLayout>
    );
  }
}
