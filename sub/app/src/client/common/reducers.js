//
// Copyright 2016 Minder Labs.
//

// TODO(burdon): Rename app_reducers.

import { Analytics } from './analytics'

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

      // Find the query matching Navbar updates.
      let query = state.apollo.queries[queryId];
    }
  }

  return state;
};

//-------------------------------------------------------------------------------------------------
// App.
//-------------------------------------------------------------------------------------------------

const APP_NAMESPACE = 'MINDER_APP';

/**
 * Main App actions.
 */
export class AppAction {

  static ACTION = {
    REGISTER:       `${APP_NAMESPACE}/REGISTER`,
    SEARCH:         `${APP_NAMESPACE}/SEARCH`,
    CANVAS_STATE:   `${APP_NAMESPACE}/CANVAS_STATE`
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

  /**
   * Register client (after server connect).
   */
  static register(userProfile, server=undefined) {
    console.assert(userProfile);
    return {
      type: AppAction.ACTION.REGISTER,
      value: {
        userProfile,
        server
      }
    };
  }

  /**
   * Set search state (preserved across navigation).
   */
  static search(text) {
    return {
      type: AppAction.ACTION.SEARCH,
      value: text
    };
  }

  /**
   * Set canvas state (e.g., current view).
   */
  static setCanvasState(canvas) {
    return {
      type: AppAction.ACTION.CANVAS_STATE,
      value: canvas
    }
  }
}

/**
 * @param injector
 * @param config
 * @param userProfile
 * @constructor
 */
export const AppReducer = (injector, config, userProfile=undefined) => {
  console.assert(injector && config);

  const initialState = {

    // NOTE: Needed since can't be passed via React context to HOC containers.
    injector: injector,

    // Client config.
    config: config,

    // User profile (from config or background page).
    // NOTE: The React context contains the current Viewer (provided by the top-level Activity).
    userProfile,

    // Search bar.
    search: {
      text: ''
    },

    // Board type.
    canvas: {
      boardAlias: undefined
    }
  };

  return (state=initialState, action) => {
//  console.log('ACTION[%s]: %s', action.type, JSON.stringify(state));
    switch (action.type) {

      case AppAction.ACTION.REGISTER: {
        return _.assign(state, _.pick(action.value, ['userProfile', 'server']));
      }

      // TODO(burdon): Get search query (not just text).
      case AppAction.ACTION.SEARCH: {
        // TODO(madadam): Add delay or only log final query -- now we send an event for every keystroke, it's overkill.
        // TODO(madadam): Remove user query from analytics events, for privacy.
        //                Search logs need to be handled with greater care.
        let analytics = state.injector.get(Analytics.INJECTOR_KEY);
        analytics && analytics.track('search', {text: action.value});
        return _.set(state, 'search.text', action.value);
      }

      case AppAction.ACTION.CANVAS_STATE: {
        return _.set(state, 'canvas', action.value);
      }
    }

    return state
  };
};

//-------------------------------------------------------------------------------------------------
// Context.
//-------------------------------------------------------------------------------------------------

const CONTEXT_NAMESPACE = 'MINDER_CONTEXT';

/**
 * Application context (e.g., current page for CRX, location, time, etc.)
 * NOTE: This isn't limited to the CRX.
 */
export class ContextAction {

  static initialState = {};

  static ACTION = {
    UPDATE_CONTEXT: `${CONTEXT_NAMESPACE}/UPDATE`,
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
      return action.context || {};
    }
  }

  return state;
};
