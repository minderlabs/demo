//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';

import { AppAction } from '../reducers';

import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';

import FolderView from '../view/folder';

/**
 * Finder Activity.
 */
class FinderActivity extends React.Component {

  static contextTypes = {
    config: React.PropTypes.object.isRequired
  };

  /**
   * Params set by the router.
   */
  static propTypes = {
    params: React.PropTypes.shape({
      folder: React.PropTypes.string.isRequired
    })
  };

  render() {
    let { config } = this.context;
    let { params } = this.props;
    let { folder='inbox' } = params;

    let finder = <FolderView folder={ folder }/>;

    let platform = _.get(config, 'app.platform');
    if (platform === 'mobile' || platform === 'crx') {
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

const mapStateToProps = (state, ownProps) => {
  let { config } = AppAction.getState(state);
  return {
    config
  };
};

export default connect(mapStateToProps)(FinderActivity);
