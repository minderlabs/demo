//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';
import { browserHistory, IndexRedirect, Redirect, Router, Route } from 'react-router';

// TODO(burdon): Create lib for UX and Data.
import ItemList from '../../components/web/item_list';
import CreateItemMutation from '../../mutation/create_item';

import HomeView from './view/home';
import DetailView from './view/detail';

import './demo.less';

//
// Router paths.
//
const URI = {
  ROOT:     '/',
  HOME:     '/home',
  DETAIL:   '/detail'
};

/**
 * App container.
 */
class DemoApp extends React.Component {

  render() {
    let { user } = this.props;

    const Layout = ({ view }) => {
      return (
        <div className="app-panel">
          <h1>{ user.title }</h1>

          <div className="app-view app-panel-column">
            { view }
          </div>
        </div>
      );
    };

    // TODO(burdon): Config server to enable /detail/key (second slash).

    console.log('####');

    return (
      <Router history={ browserHistory }>
        <Route path={ URI.ROOT } component={ Layout }>
          <IndexRedirect to={ URI.DETAIL + '/xx' }/>

          <Route path={ URI.HOME }
                 components={{
                   view: () => { return ( <HomeView user={ user }/> ) }
                 }}/>

          <Route path={ URI.DETAIL + '/:itemId' }
                 components={{
                   view: DetailView
                 }}/>
        </Route>

        <Redirect from='*' to={ URI.HOME }/>
      </Router>
    );
  }
}
                   // view: (context) => {
                   //   console.log(context);
                   //   return ( <DetailView user={ user }/> )
                   // }

//
// https://facebook.github.io/relay/docs/guides-containers.html
//

// TODO(burdon): Move to view?
export default Relay.createContainer(DemoApp, {
  fragments: {
    user: () => Relay.QL`
      fragment on User {
        title,

        ${ItemList.getFragment('user')},
        ${CreateItemMutation.getFragment('user')}
      }
    `
  }
});
