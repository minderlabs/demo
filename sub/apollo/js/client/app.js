//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { Match } from 'react-router';
import { ControlledBrowserRouter } from 'react-router-addons-controlled'
import { connect } from 'react-redux'
import { ApolloProvider } from 'react-apollo';

import { ACTION } from './reducers';

import Layout from './layout';

/**
 * Main Application Root component.
 */
class Application extends React.Component {

  static propTypes = {
    config:   React.PropTypes.object.isRequired,
    history:  React.PropTypes.object.isRequired,
    client:   React.PropTypes.object.isRequired,
    store:    React.PropTypes.object.isRequired
  };

  // https://github.com/ReactTraining/react-router-addons-controlled
  handleChange(location, action) {
    console.log('NAVIGATE[%s]: %s', action, location.pathname);

    // SYNC | PUSH | POP
    switch (action) {
      case 'SYNC': {
        this.props.dispatch({
          type: ACTION.NAVIGATE,
          location,
          action: this.props.action
        });
        break;
      }

      default: {
        // TODO(burdon): Prevent navigation if same path.
        /*
        if (location.pathname === this.props.location.pathname) {
          break;
        }
        */

        // TODO(burdon): Prevent navigate away.
        this.props.dispatch({
          type: ACTION.NAVIGATE,
          location,
          action
        });
      }
    }
  }

  render() {

    //
    // Apollo + Router (v4)
    // NOTE: Router must use declarative component (not render) otherwise squashes router properties.
    // https://react-router.now.sh/quick-start
    // https://github.com/ReactTraining/react-router/tree/v4
    //

    return (
      <ApolloProvider client={ this.props.client } store={ this.props.store }>
        <ControlledBrowserRouter history={ this.props.history }
                location={ this.props.location }
                action={ this.props.action }
                onChange={ this.handleChange.bind(this) }>

          <Match pattern="/" component={ Layout }/>
        </ControlledBrowserRouter>
      </ApolloProvider>
    );
  }
}

export default connect(
  // https://github.com/ReactTraining/react-router-addons-controlled/blob/master/redux-example/index.js
  (state) => {
    return {
      location: state.router.location,
      action: state.router.action
    }
  }
)(Application);
