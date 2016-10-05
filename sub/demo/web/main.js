//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import { render } from 'react-dom';

import { App } from '../common/app/web/demo';

import './main.less';

render(<App title="React Demo"/>, document.getElementById('app-container'));
