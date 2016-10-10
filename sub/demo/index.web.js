//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import 'babel-polyfill';

import React from 'react';
import Relay from 'react-relay';
import ReactDOM from 'react-dom';

import App from './common/app/web/app';
import AppHomeRoute from './common/app/web/routes';

ReactDOM.render(<Relay.Renderer
    environment={Relay.Store}
    Container={App}
    queryConfig={new AppHomeRoute()}
  />,
  document.getElementById('app-container')
);

