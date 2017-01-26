//
// Copyright 2017 Minder Labs.
//

const NAMESPACE = 'sidebar';

import { WindowMessenger } from 'minder-core';

/**
 * Sidebar Redux actions.
 */
export class SidebarAction {

  static ACTION = {
    INIT:   `${NAMESPACE}/INIT`,
    OPEN:   `${NAMESPACE}/OPEN`,
    CLOSE:  `${NAMESPACE}/CLOSE`,
    TOGGLE: `${NAMESPACE}/TOGGLE`,
    PING:   `${NAMESPACE}/PING`,
    UPDATE: `${NAMESPACE}/UPDATE`
  };

  static get namespace() {
    return NAMESPACE;
  }

  static get initalState() {
    return {
      open: false,
      events: []
    }
  }

  static getState(state, field=undefined) {
    return field ? _.get(state[NAMESPACE], field) : state[NAMESPACE];
  }

  //
  // Actions.
  //

  static init() {
    return {
      type: SidebarAction.ACTION.INIT
    }
  }

  static open() {
    return {
      type: SidebarAction.ACTION.OPEN
    }
  }

  static close() {
    return {
      type: SidebarAction.ACTION.CLOSE
    }
  }

  static toggle() {
    return {
      type: SidebarAction.ACTION.TOGGLE
    }
  }

  static ping(value) {
    return {
      type: SidebarAction.ACTION.PING,
      value
    }
  }

  static update(events=[]) {
    return {
      type: SidebarAction.ACTION.UPDATE,
      events
    }
  }
}

/**
 * http://redux.js.org/docs/basics/Reducers.html#handling-actions
 */
export const SidebarReducer = (config, injector) => (state=SidebarAction.initalState, action) => {
//console.log('SidebarReducer[%s]: %s', JSON.stringify(state, 0, 2), JSON.stringify(action));

  let messenger = injector.get(WindowMessenger);
  let channel = injector.get('system-channel');

  switch (action.type) {

    // TODO(burdon): Get reponse from message to set state (invokes another action?)

    case SidebarAction.ACTION.INIT: {
      messenger.sendMessage({ command: 'INIT' });       // TODO(burdon): Understand side-effects doc.
      return _.assign({}, state, {
        open: true
      });
    }

    case SidebarAction.ACTION.OPEN: {
      messenger.sendMessage({ command: 'OPEN' });
      return _.assign({}, state, {
        open: true
      });
    }

    case SidebarAction.ACTION.CLOSE: {
      messenger.sendMessage({ command: 'CLOSE' });
      return _.assign({}, state, {
        open: false
      });
    }

    case SidebarAction.ACTION.TOGGLE: {
      // TODO(burdon): Side-effects so that response can update "online" state.
      messenger.sendMessage({ command: state[NAMESPACE].open ? 'CLOSE' : 'OPEN' });
      return _.assign({}, state, {
        open: !state[NAMESPACE].open
      });
    }

    case SidebarAction.ACTION.PING: {
      channel.postMessage({ command: 'ping', value: action.value }).wait().then(response => {
        console.log('Response: ', JSON.stringify(response));
      });
      break;
    }

    case SidebarAction.ACTION.UPDATE: {
      return _.assign({}, state, {
        events: _.concat(state.events || [], action.events)
      });
    }
  }

  return state;
};
