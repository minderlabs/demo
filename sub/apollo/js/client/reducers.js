//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

/**
 * Action types.
 */
export const ACTION = {

  MINDER_SEARCH: 'MINDER_SEARCH'
};

/**
 * Compute initial state.
 * http://redux.js.org/docs/api/Store.html
 *
 * @param config
 * @returns Redux state object.
 */
export default (config) => {

  const initialSate = {
    minder: {
      userId: config.userId,
      search: {
        text: 'A'
      }
    }
  };

  return {
    minder: (state=initialSate.minder, action) => {
      console.log('ACTION[%s]: %s', action.type, JSON.stringify(state));

      switch (action.type) {
        case ACTION.MINDER_SEARCH: {
          return _.set(state, 'search.text', action.value);
        }
      }

      return state
    }
  };
};
