//
// Copyright 2016 Minder Labs.
//

import React from 'react';

import { ReactUtil } from 'minder-ux';

import { Navbar } from '../component/navbar';
import Finder from '../view/finder';

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
    params: React.PropTypes.shape({
      folder: React.PropTypes.string.isRequired
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

      return (
        <Layout navbar={ navbar } finder={ finder }/>
      );
    });
  }
}

export default Activity.connect()(FinderActivity);
