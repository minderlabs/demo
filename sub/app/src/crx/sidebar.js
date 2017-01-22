//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import ReactDOM from 'react-dom';
import { connect, Provider } from 'react-redux';
import { createStore } from 'redux';

import { HttpUtil } from 'minder-core';

import './sidebar.less';

// TODO(burdon): Common guts with App (just different layout and configuration).
// TODO(burdon): Figure out how to test this outside of CRX. No CRX deps.
// TODO(burdon): Test React/Apollo.
// TODO(burdon): Get event when opened/closed by key press.

// Config passed from content script container.
const config = HttpUtil.parseUrl();

/**
 *
 */
class Messenger {

  // TODO(burdon): Factor out.

  constructor(script, frame) {
    console.assert(script && frame);

    this._script = script;
    this._frame = frame;
  }

  sendMessage(message) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
    // TODO(burdon): '*' could be intercepted by anything else on the page.
    parent.postMessage({
      script: this._script,
      frame: this._frame,
      message
    }, '*');
  }
}

/**
 * CRX Sidebar App.
 */
class SidebarApp extends React.Component {

  state = {
    events: []
  };

  componentWillReceiveProps(nextProps) {
    console.log('componentWillMount:', JSON.stringify(nextProps));
    this.setState({
      events: nextProps.events
    });
  }

  handleClose() {
    this.props.close();
  }

  render() {
    let i = 0;
    let events = _.map(this.state.events, event => (
      <div key={ 'item-' + i++ } className="crx-list-item">{ JSON.stringify(event) }</div>
    ));

    return (
      <div className="crx-panel crx-sidebar crx-expand">
        <div className="crx-panel crx-header">
          <h1>Minder</h1>
        </div>

        <div className="crx-panel crx-expand">
          { events }
        </div>

        <div className="crx-panel crx-footer">
          <button onClick={ this.handleClose.bind(this) }>Close</button>
        </div>
      </div>
    );
  }
}

// Subscribe to Redux store updates.
const mapStateToProps = (state, ownProps) => {
  console.log('mapStateToProps:', JSON.stringify(state));
  return {
    events: state.events
  };
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    close: () => {
      // http://redux.js.org/docs/api/Store.html#dispatch
      dispatch({ type: 'CLOSE' })
    }
  };
};

// HOC.
// https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options
const ReduxSidebarApp = connect(mapStateToProps, mapDispatchToProps)(SidebarApp);

//
// Message events.
//

// TODO(burdon): Merge in/out messaging.
const messenger = new Messenger(config.script, config.frame);
window.addEventListener('message', event => {
  let message = event.data;
  store.dispatch({
    type: 'UPDATE',
    events: message.events
  })
});

//
// Redux set-up.
//

// TODO(burdon): Reducer action generators (read Redux docs). Instead of type constants.
// http://redux.js.org/docs/faq/Reducers.html
const AppReducer = (state, action) => {
  console.log('AppReducer[%s]: %s', JSON.stringify(state, 0, 2), JSON.stringify(action));
  switch (action.type) {

    // TODO(burdon): Combine into one action with open/close arg. With state function.
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

    case 'UPDATE': {
      return {
        events: _.concat(state.events || [], action.events)
      };
    }

    default:
      return state;
  }
};

const initalState = {
  open: false,
  events: []
};

// http://redux.js.org/docs/api/createStore.html
const store = createStore(AppReducer, initalState);

// https://github.com/reactjs/react-redux/blob/master/docs/api.md#provider-store
const RootApp = (
  <Provider store={ store }>
    <ReduxSidebarApp/>
  </Provider>
);

// https://facebook.github.io/react/docs/react-dom.html
ReactDOM.render(RootApp, document.getElementById('crx-root'));

// Trigger startup via Redux.
store.dispatch({
  type: 'OPEN'
});

// TODO(burdon): Create react-router demo (with onEnter).
// https://github.com/ReactTraining/react-router/blob/master/docs/API.md#onenternextstate-replace-callback
