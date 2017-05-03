//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { SidebarAction } from './reducers';

import './test_panel.less';

/**
 * CRX Sidebar App.
 */
class SidebarApp extends React.Component {

  state = {
    events: []
  };

  componentWillReceiveProps(nextProps) {
    console.log('componentWillReceiveProps:', JSON.stringify(nextProps));
    this.setState({
      viewer: nextProps.search,
      events: nextProps.events
    });
  }

  handlePing() {
    this.props.ping();
  }

  handleClose() {
    this.props.close();
  }

  render() {
    let { viewer, events } = this.state;

    let i = 0;
    let eventRows = _.map(events, event => (
      <div key={ 'item-' + i++ } className="crx-list-item">{ JSON.stringify(event) }</div>
    ));

    return (
      <div className="crx-panel crx-sidebar crx-expand">
        <div className="crx-panel crx-header">
          <h1>Minder</h1>
        </div>

        <div className="crx-panel crx-content">
          <div>
            { JSON.stringify(viewer) }
          </div>
          <div>
            { eventRows }
          </div>
        </div>

        <div className="crx-panel crx-footer">
          <button onClick={ this.handlePing.bind(this) }>Ping</button>
          <button onClick={ this.handleClose.bind(this) }>Close</button>
        </div>
      </div>
    );
  }
}

// Subscribe to Redux store updates.
const mapStateToProps = (state, ownProps) => {
  return {
    events: SidebarAction.getState(state, 'events')
  };
};

// http://redux.js.org/docs/api/Store.html#dispatch
const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    ping: () => {
      dispatch(SidebarAction.ping('test'));
    },

    close: () => {
      dispatch(SidebarAction.toggleVisibility(false));
    }
  };
};

// Minimal test query.
const TestQuery = gql`
  query TestQuery {
    viewer {
      user {
        id 
      }
    }
  }
`;

// HOC (Redux + Apollo).
// https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options
export default compose(

  connect(mapStateToProps, mapDispatchToProps),

  graphql(TestQuery, {
    props: ({ ownProps, data }) => {
      let { errors, loading, search } = data;

      return {
        errors,
        loading,
        search
      };
    }
  })

)(SidebarApp);
