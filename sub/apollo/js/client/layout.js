//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import { Link, Match, Miss, Redirect } from 'react-router';
import { compose, graphql, withApollo } from 'react-apollo';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

import Database from '../data/database';

import DetailView from './view/detail';
import FolderView from './view/folder';

import Monitor from './component/devtools';

import './layout.less';

/**
 * Root Application.
 */
@withApollo
class Layout extends React.Component {

  static contextTypes = {
    queryRegistry: React.PropTypes.object
  };

  static propTypes = {
    client: React.PropTypes.instanceOf(ApolloClient).isRequired
  };

  constructor() {
    super(...arguments);

    // Provided by @withApollo
    // http://dev.apollodata.com/react/higher-order-components.html#withApollo
    // http://dev.apollodata.com/core/apollo-client-api.html#ObservableQuery.refetch
    console.log('State = %s', JSON.stringify(this.props.client.store.getState()['minder'], (key, value) => {
      return value;
    }));
  }

  handleRefresh() {
    this.context.queryRegistry.refetch();
  }

  render() {
    console.log('Layout.render');

    // TODO(burdon): Sidebar and query folders (available to views in redux state?)
    // TODO(burdon): Display errors in status bar.
    // TODO(burdon): Skip DevTools in prod.

    return (
      <div className="app-main-container">
        <div className="app-main-panel">

          {/*
            * Header.
            */}
          <div className="app-section app-header app-row">
            <div className="app-expand">
              <h1>Apollo Demo</h1>
            </div>
            <div>
              <Link to="/inbox">Inbox</Link>
              <Link to="/favorites">Favorites</Link>
              <Link to={ '/team/' + Database.toGlobalId('Group', 'minderlabs') }>Team</Link>
            </div>
          </div>

          {/*
            * Views:
            */}
          <div className="app-column">

            {/*
              * Item detail.
              */}
            <Match pattern="/:itemView/:itemId" component={ DetailView } queries="aa"/>

            {/*
              * Folder view.
              */}
            <Match pattern="/:folder" exactly={ true } __component={ FolderView }
                   render={ (props) => {
                     // TODO(burdon): get data?
                     console.log('###################', props);
                     return <FolderView foo="1000"/>
                   }
             }/>

            <Miss render={ () => <Redirect to="/inbox"/> }/>
          </div>

          {/*
            * Footer.
            */}
          <div className="app-section app-footer app-row">
            <div className="app-row app-expand">
              <button onClick={ this.handleRefresh.bind(this) }>Refresh</button>
            </div>

            <div>
              <div>{ this.props.data.loading ? 'LOADING' : this.props.data.error ? 'ERROR' : 'OK' }</div>
            </div>
          </div>

          {/*
            * Debug sidebar.
            */}
          <div className="app-debug">
            <Monitor/>
          </div>
        </div>
      </div>
    );
  }
}

//
// Queries
//

// TODO(burdon): Pass folders to nested containers.
// https://github.com/apollostack/react-apollo/issues/262
//
// Pending question for above.
// I have the following container tree:
// <App>
//   <Match pattern="/:folder" component={ FolderView }/>
// </App>
//
// <FolderView>
//   <ListView/>
// </FolderView>
// Now, the App container makes a query for metadata associated with each each folder (e.g., a filter) that can be displayed within the <FolderView>.
// But the container queries are called (and rendered) in reverse order (i.e., ListView, FolderView, App).
// 1). I agree with @sedubois that one of the powerful features of GraphQL is fragment composition (I'm also coming from Relay, where this is trivially supported)>
// 2). The additional benefit is enabling child containers to be "well-formed" i.e., only rendered once their data requirements are satisfied (i.e., passed in as props); also, the child's rendering function doesn't have to handle "null" data (making the code simpler and more robust).
// 3). Furthermore, the react-relay-router can block until these queries are satisfied, so that on error a different router path can be displayed. This also prevents render "flickering" i.e., the child component making a default invalid query, and then re-rendering once the parent's query loads and then reconfigures the child.


const LayoutQuery = gql`
  query LayoutQuery($userId: ID!) { 

    viewer(userId: $userId) {
      id
      user {
        title
      }
    }
    
    folders(userId: $userId) {
      id
      filter {
        type
        labels
        text
      }
    }
  }
`;

//
// Chain:
// https://github.com/alienlaboratories/react-demos/master/rb-apollo/docs/kbase/apollo_sequence.png
//
// 1). Redux.connect(mapStateToProps(state)) => component.props
// 2). => graphql.options(props) => query {variables}
// 3). => graphql.props(oldProps, data) =>
//
// 1). Redux connect(mapStateToProps(state)) maps the app state to the components props.
// 2). Apollo graphql(options(props)) maps component props to query variables.
// 3). Apollo graphql(props(oldProps, data)) replaces the component's data property with custom
//     properties (e.g., adding dispatcher).

/**
 * Map Redux state onto component properties.
 * Called whenever the state is updated via a reducer.
 * The component is rerendered if DIRECT objects that are accessed are updated.
 *
 * http://stackoverflow.com/questions/36815210/react-rerender-in-redux
 * http://redux.js.org/docs/FAQ.html#react-rendering-too-often
 * https://github.com/markerikson/redux-ecosystem-links/blob/master/devtools.md#component-update-monitoring
 *
 * @param state
 * @param ownProps
 * @returns {{active: string}}
 */
const mapStateToProps = (state, ownProps) => {
  return {
    userId: state.minder.userId
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {}
};

/**
 * Connect creates the Redux Higher Order Object.
 * NOTE: This keeps the Component dry (it defines the properties that it needs).
 *
 * http://redux.js.org/docs/basics/UsageWithReact.html
 * http://redux.js.org/docs/basics/ExampleTodoList.html
 */
export default compose(
  connect(mapStateToProps, mapDispatchToProps),

  // Configure query (from redux state).
  // http://dev.apollodata.com/react/queries.html#graphql-options
  graphql(LayoutQuery, {
    options: (props) => {
      return {
        variables: {
          userId: props.userId
        }
      };
    },
    props: ({ ownProps, data }) => {
      return {
        data
      }
    }
  })

)(Layout);
