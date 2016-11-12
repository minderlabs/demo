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

  handleChange(location, action) {
    this.props.dispatch({
      type: ACTION.NAVIGATE,
      action: (action === 'SYNC') ? this.props.action : action,
      location
    });
  }

  render() {

    //
    // Apollo + Router (v4)
    // NOTE: Router Mmust use declarative component (not render) otherwise squashes router properties.
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
