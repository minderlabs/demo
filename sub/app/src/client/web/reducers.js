//
// Copyright 2016 Minder Labs.
//

const NAMESPACE = 'minder';

/**
 * Main App actions.
 */
export class AppAction {

  static ACTION = {
    SEARCH: `${NAMESPACE}/SEARCH`
  };

  static get namespace() {
    return NAMESPACE;
  }

  static getState(state, field=undefined) {
    return field ? _.get(state[NAMESPACE], field) : state[NAMESPACE];
  }

  //
  // Actions.
  //

  static search(text) {
    return {
      type: AppAction.ACTION.SEARCH,
      value: text
    }
  }
}

/**
 * Manages state transitions.
 */
export const AppReducer = (config, injector) => {

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
      case AppAction.ACTION.SEARCH: {
        return _.set(state, 'search.text', action.value);
      }
    }

    return state
  };
};
