//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { compose } from 'react-apollo';

import { Mutator } from 'minder-core';

import { Const } from '../../../common/defs';

import { FullLayout } from '../layout/full';
import { SplitLayout } from '../layout/split';
import { CanvasContainer, CanvasNavbar } from '../component/canvas';
import Finder from '../view/finder';

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

  handleSave() {
    this.refs.canvas.save();
  }

  render() {
    let { config, params: { type, canvas, itemId } } = this.props;

    let canvasComponent = (
      <CanvasContainer ref="canvas" canvas={ canvas } type={ type } itemId={ itemId }/>
    );

    let navbar = (
      <CanvasNavbar onSave={ this.handleSave.bind(this) } canvas={ canvas } type={ type } itemId={ itemId }/>
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
      let finder = <Finder folder={ 'inbox' }/>;
      return (
        <SplitLayout navbar={ navbar } finder={ finder }>
          { canvasComponent }
        </SplitLayout>
      );
    }
  }
}

export default compose(
  Activity.connect(),
  Mutator.graphql()
)(CanvasActivity);
