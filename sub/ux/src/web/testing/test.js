//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { browserHistory, Route, Router } from 'react-router'

import TestCanvas from './dnd/canvas';
import TestList from './test_list';

import './test.less';

// TODO(burdon): For offline testing, load material-icons locally.

// TODO(burdon): Proxy to allow routes.
// http://stackoverflow.com/questions/26203725/how-to-allow-for-webpack-dev-server-to-allow-entry-points-from-react-router

const App = (
  <Router history={ browserHistory }>
    {/*
    <Route path="/" component={ TestList }/>
    */}
    <Route path="/" component={ TestCanvas }/>
  </Router>
);

ReactDOM.render(App, document.getElementById('test-container'));
