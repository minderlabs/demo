//
// Copyright 2017 Minder Labs.
//

/**
 *  Sidebar Redux actions.
 */
export class SidebarActions {

  // TODO(burdon): Split state/actions/reducers.

  static get initalState() {
    return {
      open: false,
      events: []
    }
  }

  static init() {
    return {
      type: 'INIT'
    }
  }

  static open() {
    return {
      type: 'OPEN'
    }
  }

  static close() {
    return {
      type: 'CLOSE'
    }
  }

  static toggle() {
    return {
      type: 'TOGGLE'
    }
  }

  static update(events) {
    return {
      type: 'UPDATE',
      events
    }
  }
}

/**
 * http://redux.js.org/docs/faq/Reducers.html
 */
export const SidebarReducer = (messenger) => (state, action) => {
  console.log('AppReducer[%s]: %s', JSON.stringify(state, 0, 2), JSON.stringify(action));
  switch (action.type) {

    // TODO(burdon): Get reponse from message to set state (invokes another action?)

    case 'INIT': {
      messenger.sendMessage({ command: 'INIT' });
      return {
        open: true
      };
    }

    case 'OPEN': {
      messenger.sendMessage({ command: 'OPEN' });
      return {
        open: true
      };
    }

    case 'CLOSE': {
      messenger.sendMessage({ command: 'CLOSE' });
      return {
        open: false
      };
    }

    case 'TOGGLE': {
      messenger.sendMessage({ command: state.open ? 'CLOSE' : 'OPEN' });
      return {
        open: !state.open
      };
    }

    case 'UPDATE': {
      return {
        events: _.concat(state.events || [], action.events)
      };
    }

    default:
      return state;
  }
};
