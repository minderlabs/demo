//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { Const } from '../../../common/defs';

import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';
import { CanvasContainer, CanvasNavBar } from '../component/canvas';
import FolderView from '../view/folder';

import { Activity } from './activity';

/**
 * Canvas Activity.
 */
class CanvasActivity extends React.Component {

  /**
   * Params set by the router.
   */
  static propTypes = {
    params: React.PropTypes.shape({
      type: React.PropTypes.string.isRequired,
      canvas: React.PropTypes.string,
      itemId: React.PropTypes.string.isRequired
    })
  };

  static childContextTypes = Activity.childContextTypes;

  getChildContext() {
    return Activity.getChildContext(this.props);
  }

  render() {
    let { config, params: { type, canvas, itemId } } = this.props;

    let canvasComponent = (
      <CanvasContainer canvas={ canvas } type={ type } itemId={ itemId }/>
    );

    let navbar = (
      <CanvasNavBar canvas={ canvas } type={ type } itemId={ itemId }/>
    );

    // TODO(burdon): Layout based on form factor. Replace "expand" prop below with app state.
    let platform = _.get(config, 'app.platform');
    if (platform === Const.PLATFORM.MOBILE || platform === Const.PLATFORM.CRX) {
      return (
        <FullLayout navbar={ navbar }>
          { canvasComponent }
        </FullLayout>
      );
    } else {
      // TODO(burdon): Get folder from state.
      let finder = <FolderView folder={ 'inbox' }/>;
      return (
        <SplitLayout navbar={ navbar } finder={ finder }>
          { canvasComponent }
        </SplitLayout>
      );
    }
  }
}

export default Activity.connect()(CanvasActivity);
