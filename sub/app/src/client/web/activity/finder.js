//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import BaseLayout from '../layout/base';

import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';

import FinderView from '../view/finder';

/**
 * Finder Activity.
 */
export default class FinderActivity extends React.Component {

  static contextTypes = {
    config: React.PropTypes.object.isRequired
  };

  /**
   * Params set by the router.
   */
  static propTypes = {
    params: React.PropTypes.shape({
      folder: React.PropTypes.string
    })
  };

  render() {
    let { config } = this.context;
    let { params } = this.props;
    let { folder='inbox' } = params;

    let finder = <FinderView folder={ folder }/>;

    let platform = _.get(config, 'app.platform');
    if (platform == 'mobile' || platform == 'crx') {
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
