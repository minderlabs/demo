//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import PropTypes from 'prop-types';

import { ReactUtil } from 'minder-ux';

import { Const } from '../../../common/defs';

import Finder from '../view/finder';

import { Navbar } from '../component/navbar';

import { Activity } from './activity';
import { Layout } from './layout';

/**
 * Finder Activity.
 */
class FinderActivity extends React.Component {

  /**
   * Params set by the router.
   */
  static propTypes = {
    params: PropTypes.shape({
      folder: PropTypes.string.isRequired
    })
  };

  static childContextTypes = Activity.childContextTypes;

  getChildContext() {
    return Activity.getChildContext(this.props);
  }

  render() {
    return ReactUtil.render(this, () => {
      let { config, viewer, contextManager, params: { folder='inbox' } } = this.props;

      let navbar = <Navbar/>;

      let finder = <Finder viewer={ viewer } folder={ folder } contextManager={ contextManager }/>;

      let content = null;
      let platform = _.get(config, 'app.platform');
      if (platform !== Const.PLATFORM.MOBILE && platform !== Const.PLATFORM.CRX) {
        content = <div/>;
      }

      return (
        <Layout navbar={ navbar } finder={ finder }>{ content }</Layout>
      );
    });
  }
}

export default Activity.compose()(FinderActivity);
