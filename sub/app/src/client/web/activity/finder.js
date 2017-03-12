//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { compose } from 'react-apollo';

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
    let { config, params: { folder='inbox' } } = this.props;

    // TODO(burdon): Injector context class from state (see ContextReducer).

    // TODO(burdon): Write to user store on modify (and remove from injector).
    // TODO(burdon): Tasks for contact (create and link to contact).
    // TODO(burdon): Update Injector from CRX context.
    let itemInjector = null;
    if (_.get(config, 'app.platform') === Const.PLATFORM.CRX) {
      itemInjector = (items) => {
        // TODO(burdon): Remove context if in results (and move matching item to top).
        return _.concat([{
          id: '__TEST_CONTACT__',
          type: 'Contact',
          title: 'Alice Braintree',
          email: 'alice.braintree@gmail.com'
        }], items);
      }
    }

    let navbar = <Navbar/>;

    let finder = <Finder folder={ folder } itemInjector={ itemInjector }/>;

    let platform = _.get(config, 'app.platform');
    if (platform === Const.PLATFORM.MOBILE || platform === Const.PLATFORM.CRX) {
      return (
        <FullLayout navbar={ navbar }>
          { finder }
        </FullLayout>
      )
    } else {
      return (
        <SplitLayout navbar={ navbar } finder={ finder }/>
      )
    }
  }
}

export default Activity.connect()(FinderActivity);
