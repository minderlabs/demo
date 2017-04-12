//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';

import { TypeUtil } from 'minder-core';

it('Renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<div/>, div);
});
