//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import BaseLayout from '../layout/layout';

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
    let { navbar, children } = this.props;

    return (
      <BaseLayout navbar={ navbar }>
        <div className="app-layout app-layout-full">
          { children }
        </div>
      </BaseLayout>
    );
  }
}
