//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { createDevTools } from 'redux-devtools';
import 'redux-devtools-themes';

import ChartMonitor from 'redux-devtools-chart-monitor';
import DockMonitor from 'redux-devtools-dock-monitor';
import LogMonitor from 'redux-devtools-log-monitor';

//
// https://github.com/gaearon/redux-devtools/blob/master/docs/Walkthrough.md
// https://github.com/gaearon/redux-devtools-dock-monitor
// https://github.com/gaearon/redux-devtools-log-monitor
//

export const Monitor = createDevTools(
  <DockMonitor defaultIsVisible={ true }
               changeMonitorKey="ctrl-m"
               toggleVisibilityKey="ctrl-h"
               changePositionKey="ctrl-p">
    <LogMonitor theme="grayscale"/>

    {/*
    <ChartMonitor/>
    */}

  </DockMonitor>
);
