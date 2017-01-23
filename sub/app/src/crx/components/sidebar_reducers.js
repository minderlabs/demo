//
// Copyright 2017 Minder Labs.
//

const NAMESPACE = 'sidebar';

/**
 * Sidebar Redux actions.
 */
export class SidebarActions {

  static ACTION = {
    INIT:   `${NAMESPACE}/INIT`,
    OPEN:   `${NAMESPACE}/OPEN`,
    CLOSE:  `${NAMESPACE}/CLOSE`,
    TOGGLE: `${NAMESPACE}/TOGGLE`,
    UPDATE: `${NAMESPACE}/UPDATE`
  };

  static get namespace() {
    return NAMESPACE;
  }

  static get initalState() {
    return {
      [NAMESPACE]: {
        open: false,
        events: []
      }
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
      type: SidebarActions.ACTION.INIT
    }
  }

  static open() {
    return {
      type: SidebarActions.ACTION.OPEN
    }
  }

  static close() {
    return {
      type: SidebarActions.ACTION.CLOSE
    }
  }

  static toggle() {
    return {
      type: SidebarActions.ACTION.TOGGLE
    }
  }

  static update(events) {
    return {
      type: SidebarActions.ACTION.UPDATE,
      events
    }
  }
}

/**
 * http://redux.js.org/docs/basics/Reducers.html#handling-actions
 */
export const SidebarReducer = (messenger) => (state=SidebarActions.initalState, action) => {
  console.log('AppReducer[%s]: %s', JSON.stringify(state, 0, 2), JSON.stringify(action));
  switch (action.type) {

    // TODO(burdon): Get reponse from message to set state (invokes another action?)

    case SidebarActions.ACTION.INIT: {
      messenger.sendMessage({ command: 'INIT' });       // TODO(burdon): Understand side-effects doc.
      return _.assign({}, state, {
        open: true
      });
    }

    case SidebarActions.ACTION.OPEN: {
      messenger.sendMessage({ command: 'OPEN' });
      return _.assign({}, state, {
        open: true
      });
    }

    case SidebarActions.ACTION.CLOSE: {
      messenger.sendMessage({ command: 'CLOSE' });
      return _.assign({}, state, {
        open: false
      });
    }

    case SidebarActions.ACTION.TOGGLE: {
      messenger.sendMessage({ command: state[NAMESPACE].open ? 'CLOSE' : 'OPEN' });
      return _.assign({}, state, {
        open: !state[NAMESPACE].open
      });
    }

    case SidebarActions.ACTION.UPDATE: {
      return _.assign({}, state, {
        events: _.concat(state[NAMESPACE].events || [], action.events)
      });
    }

    default:
      return state;
  }
};
