//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';

import { Const } from '../../../common/defs';

import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';
import FolderView from '../view/folder';

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
    let { config, params: { folder='inbox' } } = this.props;

    let finder = <FolderView folder={ folder }/>;

    let platform = _.get(config, 'app.platform');
    if (platform === Const.PLATFORM.MOBILE || platform === Const.PLATFORM.CRX) {
      return (
        <FullLayout>
          { finder }
        </FullLayout>
      )
    } else {
      return (
        <SplitLayout nav={ finder }/>
      )
    }
  }
}

export default connect(Activity.mapStateToProps, Activity.mapDispatchToProps)(FinderActivity);
