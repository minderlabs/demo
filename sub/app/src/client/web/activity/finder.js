//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { Const } from '../../../common/defs';

import { Navbar } from '../component/navbar';
import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';
import Finder from '../view/finder';

import { Activity } from './activity';

/**
 * Finder Activity.
 */
class FinderActivity extends React.Component {

  /**
   * Params set by the router.
   */
  static propTypes = {
    params: React.PropTypes.shape({
      folder: React.PropTypes.string.isRequired
    })
  };

  static childContextTypes = Activity.childContextTypes;

  getChildContext() {
    return Activity.getChildContext(this.props);
  }

  render() {
    let { config, contextManager, params: { folder='inbox' } } = this.props;

    let navbar = <Navbar/>;

    let finder = <Finder folder={ folder } contextManager={ contextManager }/>;

    let platform = _.get(config, 'app.platform');
    if (platform === Const.PLATFORM.MOBILE || platform === Const.PLATFORM.CRX) {
      return (
        <FullLayout navbar={ navbar }>
          { finder }
        </FullLayout>
      );
    } else {
      return (
        <SplitLayout navbar={ navbar } finder={ finder }/>
      );
    }
  }
}

export default Activity.connect()(FinderActivity);
