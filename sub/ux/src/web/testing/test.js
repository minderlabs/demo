//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { TestView } from './test_view';

// TODO(burdon): For offline testing, load material-icons locally.

import './test.less';

ReactDOM.render(
  <TestView/>, document.getElementById('test-container')
);
