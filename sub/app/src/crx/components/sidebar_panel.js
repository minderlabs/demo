//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { connect, Provider } from 'react-redux';

import { SidebarActions } from './sidebar_reducers';

import './sidebar_panel.less';

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

        <div className="crx-panel crx-content">
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
    events: SidebarActions.getState(state, 'events')
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
export default connect(mapStateToProps, mapDispatchToProps)(SidebarApp);
