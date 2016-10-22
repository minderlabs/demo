//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';
import { applyRouterMiddleware, browserHistory, Router } from 'react-router';
import useRelay from 'react-router-relay';

import config from './js/app/web/config';
import routes from './js/app/web/routes';

//
// Set network layer.
//

Relay.injectNetworkLayer(config.getNetworkLayer());

//
// History
// https://github.com/ReactTraining/react-router/blob/master/docs/guides/Histories.md
//

browserHistory.listen((state) => {
  console.log('History changed:', state.pathname);
});

//
// Start app.
// https://github.com/ReactTraining/react-router
// https://facebook.github.io/relay/docs/api-reference-relay-renderer.html#content
//

ReactDOM.render(
  <Router
    history={ browserHistory }
    routes={ routes }
    render={ applyRouterMiddleware(useRelay) }
    environment={ Relay.Store }
    onReadyStateChange={
      (state) => {
        if (state.error) {
          console.error(state.error);
          if (config['redirectOnError']) {
            setTimeout(() => {
              let errorForm = $('#app-error');
              errorForm.find('input').val(state.error);
              errorForm.submit();
            }, 1000);
          }
        } else if (state.ready) {
          console.log('State changed:', _.map(state.events, (event) => { return event.type; }).join(' => '));
        }
      }
    }
  />,

  // TODO(burdon): Get ID from config.
  document.getElementById('app-container')
);
