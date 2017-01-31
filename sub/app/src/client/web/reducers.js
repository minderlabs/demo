//
// Copyright 2016 Minder Labs.
//

const NAMESPACE = 'minder';

/**
 * Main App actions.
 */
export class AppAction {

  static ACTION = {
    REGISTER:   `${NAMESPACE}/REGISTER`,
    SEARCH:     `${NAMESPACE}/SEARCH`
  };

  static get namespace() {
    return NAMESPACE;
  }

  static getState(state, field=undefined) {
    return field ? _.get(state[NAMESPACE], field) : state[NAMESPACE];
  }

  //
  // Action creators.
  // TODO(burdon): Use thunk to handle async request.
  // http://redux.js.org/docs/advanced/AsyncActions.html
  // http://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559
  //

  static register(user) {
    return {
      type: AppAction.ACTION.REGISTER,
      value: user
    };
  }

  static search(text) {
    return {
      type: AppAction.ACTION.SEARCH,
      value: text
    };
  }
}

/**
 * Manages state transitions.
 */
export const AppReducer = (config, injector) => {
  console.assert(config);

  // TODO(burdon): State should only pertain to actions (i.e., search).
  // NOTE: We need the injector here since it can't be passed via React context to HOC containers.

  const initialState = {
    injector: injector,     // TODO(burdon): Factor out?

    config: config,
    user: config.user,
    team: config.team,      // TODO(burdon): Should be queried list.

    search: {
      text: ''
    }
  };

  return (state=initialState, action) => {
//  console.log('ACTION[%s]: %s', action.type, JSON.stringify(state));

    switch (action.type) {
      case AppAction.ACTION.REGISTER: {
        console.log('Registered: ' + JSON.stringify(action.value));
        return _.set(state, 'user', action.value);
      }

      // TODO(burdon): Get search query (not just text).
      case AppAction.ACTION.SEARCH: {
        return _.set(state, 'search.text', action.value);
      }
    }

    return state
  };
};
