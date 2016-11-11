//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import * as themes from 'redux-devtools-themes';

import { createDevTools } from 'redux-devtools';

import DockMonitor from 'redux-devtools-dock-monitor';
import LogMonitor from 'redux-devtools-log-monitor';

//
// https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md
// https://github.com/gaearon/redux-devtools-dock-monitor
// https://github.com/gaearon/redux-devtools-log-monitor
//

const DevTools = createDevTools(
  <DockMonitor defaultIsVisible={ true } toggleVisibilityKey="ctrl-h" changePositionKey="">
    <LogMonitor theme="grayscale"/>
  </DockMonitor>
);

export default DevTools;
