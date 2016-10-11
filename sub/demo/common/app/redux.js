//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

// TODO(burdon): Work in progress.

import { createStore } from 'redux';

//
// Reducers
//

const rootReducer = function(state, action) {
  switch (action.type) {

    case 'TOGGLE_FAVORITE':
      break;

    default:
      console.warn('Reduce', JSON.stringify(action), JSON.stringify(state));
      return state;
  }
};

//
// State
//

export function storeFactory(initialState) {
  return createStore(rootReducer, initialState);
}
