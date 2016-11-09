//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';

import { createDevTools } from 'redux-devtools';

import LogMonitor from 'redux-devtools-log-monitor';
import DockMonitor from 'redux-devtools-dock-monitor';

//
// https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md
//

const DevTools = createDevTools(
  <DockMonitor toggleVisibilityKey='ctrl-h'
               changePositionKey='ctrl-q'
               defaultIsVisible={ true }>
    <LogMonitor theme='tomorrow'/>
  </DockMonitor>
);

export default DevTools;
