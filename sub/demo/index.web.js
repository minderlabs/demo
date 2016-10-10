//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import Relay from 'react-relay';
import { render } from 'react-dom';

import { App } from './common/app/web/app';
import { AppHomeRoute } from './common/app/web/routes';

//render(<DemoApp title="React Demo"/>, document.getElementById('app-container'));
render(<Relay.Renderer
    title="React Demo"
    environment={Relay.Store}
    container={App}
    queryConfig={new AppHomeRoute()}
  />,
  document.getElementById('app-container')
);

