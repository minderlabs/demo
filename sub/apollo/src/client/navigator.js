//
// Copyright 2016 Alien Laboratories, Inc.
//

import { goBack, push } from 'react-router-redux'
import { Path } from './path';

import { ID } from 'minder-core';

export class Navigator {
  constructor(dispatch) {
    this.dispatch = dispatch;
  }

  back() {
    this.dispatch(goBack());
  }

  toItem(item) {
    this.dispatch(push(Path.detail(item.type, ID.toGlobalId(item.type, item.id))));
  }
}

