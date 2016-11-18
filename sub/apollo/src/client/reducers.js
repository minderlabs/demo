//
// Copyright 2016 Minder Labs.
//

'use strict';

/**
 * Action types.
 */
export const ACTION = {

  NAVIGATE: 'APP_NAVIGATE',

  SEARCH:   'APP_SEARCH'
};

/**
 * Compute initial state.
 * http://redux.js.org/docs/api/Store.html
 *
 * @param config App configuration (provided by server).
 * @param matcher Item matcher.
 * @returns Redux state object.
 */
export const AppReducer = (config, matcher) => {

  // TODO(burdon): Multiple reducers? Split by section?

  const initialSate = {
    minder: {
      matcher: matcher,
      userId: config.userId,
      search: {
        text: ''
      }
    }
  };

  return {
    minder: (state=initialSate.minder, action) => {
//    console.log('ACTION[%s]: %s', action.type, JSON.stringify(state));

      switch (action.type) {
        case ACTION.SEARCH: {
          return _.set(state, 'search.text', action.value);
        }
      }

      return state
    }
  };
};
