//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import 'babel-polyfill';

import React from 'react';
import Relay from 'react-relay';
import ReactDOM from 'react-dom';

import ItemList from './common/components/itemList';
import AppHomeRoute from './common/app/web/routes';

ReactDOM.render(<Relay.Renderer
    environment={Relay.Store}
    Container={ItemList}
    queryConfig={new AppHomeRoute()}
  />,
  document.getElementById('app-container')
);

