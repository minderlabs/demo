//
// Copyright 2016 Minder Labs.
//

/**
 * Action types.
 */
export const ACTION = {

  SEARCH: 'MINDER_SEARCH'

};

/**
 * Compute initial state.
 * http://redux.js.org/docs/api/Store.html
 *
 * @param config App configuration (provided by server).
 * @param injector Dependency injector.
 * @returns Redux state object.
 */
export const AppReducer = (config, injector) => {

  // TODO(burdon): Multiple reducers? Split by section?

  const initialSate = {
    minder: {
      injector: injector,
      user: config.user,
      team: config.team,      // TODO(burdon): Temp. Should be queried list.
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
