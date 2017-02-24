//
// Copyright 2016 Minder Labs.
//

//-------------------------------------------------------------------------------------------------
// Global.
// The global reducer listens for Apollo query results and updates the App state.
//-------------------------------------------------------------------------------------------------

export const GlobalAppReducer = (state, action) => {
  switch (action.type) {

    //
    // Listen for Apollo query results (and cached results).
    //
    case 'APOLLO_QUERY_RESULT':
    case 'APOLLO_QUERY_RESULT_CLIENT': {
      let { queryId } = action;

      // Find the query matching NavBar updates.
      let query = state.apollo.queries[queryId];
      if (_.get(query.metadata, 'subscription') == GlobalAppReducer.SUBSCRIPTION.NAVBAR_ITEM) {
        let item = _.get(action, 'result.data.item');
        if (item) {
          return _.set(state, `${APP_NAMESPACE}.navbar.item`, item);
        }
      }
      break;
    }
  }

  return state;
};

GlobalAppReducer.SUBSCRIPTION = {
  NAVBAR_ITEM: 'NAVBAR_ITEM'
};

//-------------------------------------------------------------------------------------------------
// App.
//-------------------------------------------------------------------------------------------------

const APP_NAMESPACE = 'app';

/**
 * Main App actions.
 */
export class AppAction {

  // TODO(burdon): Look for wrappers to make this simpler?

  static ACTION = {
    REGISTER:     `${APP_NAMESPACE}/REGISTER`,
    SEARCH:       `${APP_NAMESPACE}/SEARCH`
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
  // Use thunk to handle async requests.
  // http://redux.js.org/docs/advanced/AsyncActions.html
  // http://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559
  //

  static register(registration, server=undefined) {
    console.assert(registration);
    return {
      type: AppAction.ACTION.REGISTER,
      value: {
        server,
        registration
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

/**
 * @param injector
 * @param config
 * @param registration
 * @constructor
 */
export const AppReducer = (injector, config, registration=undefined) => {
  console.assert(injector && config);

  const initialState = {
    // NOTE: Needed since can't be passed via React context to HOC containers.
    injector: injector,

    config: config,

    registration,

    search: {
      text: ''
    },

    navbar: {
      title: ''
    }
  };

  return (state=initialState, action) => {
//  console.log('ACTION[%s]: %s', action.type, JSON.stringify(state));
    switch (action.type) {

      case AppAction.ACTION.REGISTER: {
        return _.assign(state, _.pick(action.value, ['registration', 'server']));
      }

      // TODO(burdon): Get search query (not just text).
      case AppAction.ACTION.SEARCH: {
        return _.set(state, 'search.text', action.value);
      }
    }

    return state
  };
};

//-------------------------------------------------------------------------------------------------
// Context.
//-------------------------------------------------------------------------------------------------

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
