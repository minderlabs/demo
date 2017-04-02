//
// Copyright 2017 Minder Labs.
//

const SIDEBAR_NAMESPACE = 'MINDER_SIDEBAR';

import { WindowMessenger } from 'minder-core';

import { SystemChannel, SidebarCommand } from '../common';

/**
 * Sidebar Redux actions.
 */
export class SidebarAction {

  static ACTION = {
    INITIALIZED:        `${SIDEBAR_NAMESPACE}/INITIALIZED`,
    PING:               `${SIDEBAR_NAMESPACE}/PING`,
    UPDATE_VISIBILITY:  `${SIDEBAR_NAMESPACE}/UPDATE_VISIBILITY`
  };

  static get namespace() {
    return SIDEBAR_NAMESPACE;
  }

  static initalState = {
    timestamp: null,            // TS from background page ping.
    open: false,
    events: []
  };

  static getState(state, field=undefined) {
    state = _.get(state, SidebarAction.namespace, {});
    return field ? _.get(state, field) : state;
  }

  //
  // Action creators.
  // NOTE: Uses thunk to handle async request.
  // http://redux.js.org/docs/advanced/AsyncActions.html
  // http://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559
  //

  /**
   * Ping the background page.
   * @param value
   */
  // TODO(burdon): Test with test panel.
  static ping(value) {
    return (dispatch, getState, injector) => {
      // Set waiting.
      dispatch({
        type: SidebarAction.ACTION.PING
      });

      injector.get('system-channel')
        .postMessage({ command: SystemChannel.PING }, true)
        .then(response => {
          // Set received response.
          dispatch({
            type: SidebarAction.ACTION.PING,
            timestamp: response.timestamp
          });
      });
    };
  }

  /**
   * Toggle the sidebar.
   * @param {boolean|undefined} open Open/Close or Toggle if undefined.
   */
  static toggleVisibility(open=undefined) {
    return (dispatch, getState, injector) => {
      injector.get(WindowMessenger).postMessage({ command: SidebarCommand.SET_VISIBILITY, open });
    };
  }

  /**
   * Updates the sidebar visibility.
   * @param visible
   */
  static updateVisibility(visible) {
    return {
      type: SidebarAction.ACTION.UPDATE_VISIBILITY,
      visible
    };
  }
}

/**
 * http://redux.js.org/docs/basics/Reducers.html#handling-actions
 */
export const SidebarReducer = (state=SidebarAction.initalState, action) => {
//console.log('SidebarReducer[%s]: %s', JSON.stringify(state, 0, 2), JSON.stringify(action));

  switch (action.type) {

    case SidebarAction.ACTION.PING: {
      return _.assign({}, state, {
        timestamp: action.timestamp
      });
    }

    case SidebarAction.ACTION.UPDATE_VISIBILITY: {
      return _.assign({}, state, {
        visible: action.visible
      });
    }

    default:
      return state;
  }
};
