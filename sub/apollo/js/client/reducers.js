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
 * Return app reducers.
 *
 * @param config
 * @returns {Function}
 */
export default (config) => {

  // TODO(burdon): Create layers.

  //
  // Redux state.
  //

  const initialState = {

    userId: config.userId,

    search: {
      text: ''
    }
  };

  //
  // Reducer.
  //

  return {

    // App reducers.
    // http://redux.js.org/docs/api/Store.html
    minder: (state=initialState, action) => {
      console.log('ACTION[%s]: %s', action.type, JSON.stringify(state));
      switch (action.type) {
        case ACTION.MINDER_SEARCH: {
          return _.set(state, 'search.text', action.value);
        }
      }

      return state
    }
  };
}
