//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { ReactUtil } from 'minder-ux';

import { Const } from '../../../common/defs';

import { CanvasContainer, CanvasNavbar } from '../component/canvas';
import Finder from '../view/finder';

import { Activity } from './activity';
import { Layout } from './layout';

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
    return ReactUtil.render(this, () => {
      let { config, viewer, params: { type, canvas, itemId } } = this.props;

      let navbar = (
        <CanvasNavbar onSave={ this.handleSave.bind(this) } canvas={ canvas } type={ type } itemId={ itemId }/>
      );

      let canvasComponent = (
        <CanvasContainer ref="canvas" canvas={ canvas } type={ type } itemId={ itemId }/>
      );

      let finder = null;
      let platform = _.get(config, 'app.platform');
      if (platform !== Const.PLATFORM.MOBILE && platform !== Const.PLATFORM.CRX) {
        finder = <Finder viewer={ viewer } folder={ 'inbox' }/>;
      }

      return (
        <Layout navbar={ navbar } finder={ finder }>
          { canvasComponent }
        </Layout>
      );
    });
  }
}

export default Activity.connect()(CanvasActivity);
