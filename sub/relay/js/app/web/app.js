//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import useRelay from 'react-router-relay';
import { applyRouterMiddleware, browserHistory, Router } from 'react-router';

import Routes from './routes';


/**
 * React Relay Router.
 *
 * https://github.com/ReactTraining/react-router
 * https://github.com/relay-tools/react-router-relay
 * https://facebook.github.io/relay/docs/api-reference-relay-renderer.html#content
 */
export default class Application extends React.Component {

  static propTypes = {
    config:                 React.PropTypes.object.isRequired,
    environment:            React.PropTypes.object.isRequired,
    eventHandler:           React.PropTypes.object.isRequired,
    subscriptionManager:    React.PropTypes.object.isRequired
  };

  static childContextTypes = {
    environment:            React.PropTypes.object,
    eventHandler:           React.PropTypes.object,
    subscriptionManager:    React.PropTypes.object
  };

  constructor() {
    super(...arguments);
  }

  getChildContext() {
    return {
      environment:          this.props.environment,
      eventHandler:         this.props.eventHandler,
      subscriptionManager:  this.props.subscriptionManager
    }
  }

  handleReadyStateChange(readyState) {
    if (readyState.error) {
      // TODO(burdon): Call error handler.
      console.error(readyState.error);

      this.props.eventHandler.emit({
        type: 'error',
        message: readyState.error.message
      });

      // TODO(burdon): If not refresh then show error page in app.
      // Use form to redirect to server error page (i.e., POST with error values).
      if (this.props.config.get('redirectOnError')) {
        setTimeout(() => {
          let errorForm = $('#app-error');
          errorForm.find('input').val(readyState.error);
          errorForm.submit();
        }, 1000);
      }
    } else if (readyState.ready) {
      console.log('State changed:', _.map(readyState.events, (event) => event.type).join(' => '));
    }
  }

  render() {
    return (
      <Router
        routes={ Routes(this.props.config) }
        render={ applyRouterMiddleware(useRelay) }
        history={ browserHistory }
        environment={ this.props.environment }
        onReadyStateChange={ this.handleReadyStateChange.bind(this) }
      />
    );
  }
}
