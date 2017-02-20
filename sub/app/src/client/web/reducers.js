//
// Copyright 2016 Minder Labs.
//

const APP_NAMESPACE = 'app';

/**
 * Main App actions.
 */
export class AppAction {

  static ACTION = {
    REGISTER:   `${APP_NAMESPACE}/REGISTER`,
    SEARCH:     `${APP_NAMESPACE}/SEARCH`
  };

  static get namespace() {
    return APP_NAMESPACE;
  }

  static getState(state, field=undefined) {
    state = _.get(state, AppAction.namespace, {});
    return field ? _.get(state, field) : state;
  }

  //
  // Action creators.
  // TODO(burdon): Use thunk to handle async request.
  // http://redux.js.org/docs/advanced/AsyncActions.html
  // http://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559
  //

  static register(server, groupId, userId) {
    return {
      type: AppAction.ACTION.REGISTER,
      value: {
        server, groupId, userId
      }
    };
  }

  static search(text) {
    return {
      type: AppAction.ACTION.SEARCH,
      value: text
    };
  }
}

export const AppReducer = (config, injector) => {
  console.assert(config);

  const initialState = {
    // NOTE: Needed since can't be passed via React context to HOC containers.
    injector: injector,

    config: config,

    // TODO(burdon): Create registration state.
    groupId: config.groupId,
    userId: config.userId,

    search: {
      text: ''
    }
  };

  return (state=initialState, action) => {
//  console.log('ACTION[%s]: %s', action.type, JSON.stringify(state));

    switch (action.type) {
      case AppAction.ACTION.REGISTER: {
        console.log('Registered: ' + JSON.stringify(action.value));
        return _.assign(state, _.pick(action.value, ['server', 'userId', 'groupId']));
      }

      // TODO(burdon): Get search query (not just text).
      case AppAction.ACTION.SEARCH: {
        return _.set(state, 'search.text', action.value);
      }
    }

    return state
  };
};

const CONTEXT_NAMESPACE = 'context';

/**
 * Application context (e.g., current page for CRX, location, time, etc.)
 */
export class ContextAction {

  static initialState = {
    context: null
  };

  static ACTION = {
    UPDATE_CONTEXT: `${CONTEXT_NAMESPACE}/UPDATE_CONTEXT`,
  };

  static get namespace() {
    return CONTEXT_NAMESPACE;
  }

  static getState(state, field=undefined) {
    state = _.get(state, ContextAction.namespace, {});
    return field ? _.get(state, field) : state;
  }

  /**
   * Received context events from content script.
   * @param context
   */
  static updateContext(context) {
    return {
      type: ContextAction.ACTION.UPDATE_CONTEXT,
      context
    }
  }
}

export const ContextReducer = (state=ContextAction.initialState, action) => {
  switch (action.type) {

    case ContextAction.ACTION.UPDATE_CONTEXT: {
      return _.assign({}, state, {
        context: action.context
      });
    }
  }

  return state;
};
