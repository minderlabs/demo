//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';

import BaseLayout from '../layout/base';

import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';

import FinderView from '../view/finder';

/**
 * Finder Activity.
 */
export default class FinderActivity extends React.Component {

  /**
   * Properties set by the router.
   */
  static propTypes = {
    params: React.PropTypes.shape({
      folder: React.PropTypes.string
    })
  };

  render() {
    let { params } = this.props;
    let { folder } = params;

    let finder = <FinderView folder={ folder }/>;

    // TODO(burdon): Layout based on form factor.
    if (BaseLayout.isMobile()) {
      return (
        <FullLayout>
          { finder }
        </FullLayout>
      )
    } else {
      return (
        <SplitLayout nav={ finder }>
        </SplitLayout>
      )
    }
  }
}
