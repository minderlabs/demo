//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { EventHandler, QueryParser } from 'minder-core';
import { SearchBar, Sidebar, SidebarToggle } from 'minder-ux';

import { Const } from '../../common/defs';
import { QueryRegistry } from '../data/subscriptions';

import { Navigator } from '../path'

//import { Monitor } from '../component/devtools';

import { SearchList } from '../component/list_factory';
import { NavBar } from '../component/navbar';
import { SidebarPanel } from '../component/sidebar';
import { StatusBar } from '../component/statusbar';

import { ACTION } from '../reducers';

import './layout.less';

/**
 * Root Application.
 */
class Layout extends React.Component {

  static childContextTypes = {
    navigator: React.PropTypes.object
  };

  static contextTypes = {
    injector: React.PropTypes.object,
  };

  static propTypes = {
    // TODO(burdon): Get from injector.
    queryRegistry: React.PropTypes.object.isRequired,

    navigator: React.PropTypes.object.isRequired,

    data: React.PropTypes.shape({
      viewer: React.PropTypes.object
    })
  };

  constructor() {
    super(...arguments);

    // TODO(burdon): Need to display error state on startup (status not yet rendered).
    this.context.injector.get(EventHandler)
      .listen('error',        event => { this.refs.status && this.refs.status.error(event.message); })
      .listen('network.in',   event => { this.refs.status && this.refs.status.networkIn();          })
      .listen('network.out',  event => { this.refs.status && this.refs.status.networkOut();         });
  }

  getChildContext() {
    return {
      navigator: this.props.navigator
    };
  }

  handleToolbarClick(id) {
    switch (id) {
      case 'refresh': {
        this.props.queryRegistry.invalidate();
        break;
      }
    }
  }

  handleSearch(text) {
    this.props.onSearch(text);
  }

  handleItemSelect(item) {
    this.refs.search.reset();
    this.props.navigator.pushDetail(item);
  }

  render() {
    let { children, filter, team, viewer, folders } = this.props;

    let sidebar = <SidebarPanel team={ team } folders={ folders }/>;

    return (
      <div className="app-main-container ux-fullscreen">
        <div className="app-main-panel ux-panel">

          {/* Header */}
          <div className="ux-app-header ux-section ux-row">
            <div className="ux-expand">
              <SidebarToggle sidebar={ () => this.refs.sidebar }/>
              <h1>{ Const.APP_NAME }</h1>
            </div>
            <div>
              <ul>
                <li>{ viewer && viewer.user.title }</li>
                <li><a href="/user/logout">Logout</a></li>
              </ul>
            </div>
          </div>

          {/* Nav bar */}
          <NavBar/>

          {/* Sidebar */}
          <Sidebar ref="sidebar" sidebar={ sidebar }>

            {/* Content view. */}
            <div className="ux-column">

              {/* Search bar (and panel) */}
              <div className="app-search-container">
                <div className="ux-section ux-toolbar">
                  <SearchBar ref="search" onSearch={ this.handleSearch.bind(this) }/>
                </div>

                {/*
                  * TODO(burdon): Factor out slide panel.
                  * TODO(burdon): Custom renderer (remove favorite property).
                  * TODO(burdon): Limit results to 10 items (shorter than other panels.)
                  */}
                <div className='app-drop'>
                  <div className="app-drop-panel">
                    <SearchList favorite={ false } filter={ filter }
                                onItemSelect={ this.handleItemSelect.bind(this) }/>
                  </div>
                </div>
              </div>

              { children }
            </div>
          </Sidebar>

          {/* Footer */}
          <div className="app-footer">
            <StatusBar ref="status" onClick={ this.handleToolbarClick.bind(this) }/>
          </div>

          {/* Debug sidebar */}
          {/*
          <div className="ux-debug">
            <Monitor/>
          </div>
          */}
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
//
// Now, the App container makes a query for metadata associated with each each folder (e.g., a filter) that can be displayed within the <FolderView>.
// But the container queries are called (and rendered) in reverse order (i.e., ListView, FolderView, App).
// 1). I agree with @sedubois that one of the powerful features of GraphQL is fragment composition (I'm also coming from Relay, where this is trivially supported)>
// 2). The additional benefit is enabling child containers to be "well-formed" i.e., only rendered once their data requirements are satisfied (i.e., passed in as props); also, the child's rendering function doesn't have to handle "null" data (making the code simpler and more robust).
// 3). Furthermore, the react-relay-router can block until these queries are satisfied, so that on error a different router path can be displayed. This also prevents render "flickering" i.e., the child component making a default invalid query, and then re-rendering once the parent's query loads and then reconfigures the child.

const LayoutQuery = gql`
  query LayoutQuery { 

    viewer {
      id
      user {
        title
      }
    }

    folders {
      id
      alias
      title
    }
  }
`;

//
// TODO(burdon): Moved docs to docs/kbase/apollo.md
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
  let { injector, search, user, team } = state.minder;

  // TODO(burdon): Hack: Should depend on whether child supports search filtering.
  // https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
  // NOTE: Search state come from dispatch via SearchBar.
  let queryParser = injector.get(QueryParser);
  let filter = _.isEmpty(ownProps.params.view) ? {} : queryParser.parse(search.text);

  return {
    queryRegistry: state.minder.injector.get(QueryRegistry),
    filter,
    user,
    team
  }
};

const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    navigator: new Navigator(dispatch),

    // Store search state (so can restore value when nav back).
    onSearch: (value) => {
      dispatch({ type: ACTION.SEARCH, value });
    },
  }
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
    props: ({ ownProps, data }) => {
      let { viewer, folders } = data;

      return {
        viewer, folders
      }
    }
  })

)(Layout);
