//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { compose, graphql } from 'react-apollo';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import gql from 'graphql-tag';

import { DomUtil, ID, IdGenerator, Mutator, UpdateItemsMutation } from 'minder-core';
import { ReactUtil, Sidebar, SidebarToggle } from 'minder-ux';

import { Const } from '../../../common/defs';
import { Path } from '../../common/path';
import { AppAction } from '../../common/reducers';

import { SidePanel } from '../component/sidepanel';
import { StatusBar } from '../component/statusbar';

import './layout.less';

/**
 * Layout for all containers.
 */
export class BaseLayout extends React.Component {

  static contextTypes = {
    config: React.PropTypes.object.isRequired,
    typeRegistry: React.PropTypes.object.isRequired,
    queryRegistry: React.PropTypes.object.isRequired,
    eventHandler: React.PropTypes.object.isRequired
  };

  static propTypes = {
    navbar: React.PropTypes.object.isRequired,
    className: React.PropTypes.string
  };

  constructor() {
    super(...arguments);

    this.context.eventHandler
      .listen('error',        event => { this.refs.status && this.refs.status.error(event); })
      .listen('network.in',   event => { this.refs.status && this.refs.status.networkIn(); })
      .listen('network.out',  event => { this.refs.status && this.refs.status.networkOut(); });
  }

  handleToolbarAction(action) {
    let { config } = this.context;

    switch (action) {
      case 'bug': {
        console.warn(JSON.stringify(config));
        break;
      }

      case 'refresh': {
        this.context.queryRegistry.invalidate();
        break;
      }
    }
  }

  render() {
    return ReactUtil.render(this, () => {
      let { config, typeRegistry } = this.context;
      let { navbar, search, children, className } = this.props;
      let { viewer } = this.props; // Data.

      let sidePanel = <SidePanel typeRegistry={ typeRegistry }
                                 folders={ viewer.folders }
                                 group={ viewer.group }
                                 projects={ viewer.group.projects }/>;

      return (
        <div className="ux-fullscreen">
          <div className={ DomUtil.className('ux-main-layout', 'app-base-layout', className) }>

            {/* Header */}
            <div className="ux-header ux-row">
              <div className="ux-row ux-expand">
                <SidebarToggle sidebar={ () => this.refs.sidebar }/>
                <h1>{ Const.APP_NAME }</h1>
              </div>
              <div>
                <ul className="ux-inline">
                  { _.get(config, 'app.platform') !== Const.PLATFORM.CRX &&
                  <li>
                    <Link to={ Path.canvas(ID.toGlobalId('Group', viewer.group.id)) }>{ viewer.group.title }</Link>
                  </li>
                  }

                  <li>
                    <a target="MINDER_PROFILE" href="/user/profile">{ viewer.user.title }</a>
                  </li>
                  <li>
                    <a href="/user/logout">Logout</a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Nav bar */}
            { navbar }

            {/* Sidebar */}
            <Sidebar ref="sidebar" sidebar={ sidePanel }>

              {/* Content view. */}
              <div className="ux-column">
                { children }
              </div>
            </Sidebar>

            {/* Footer */}
            <div className="app-footer">
              <StatusBar ref="status" onAction={ this.handleToolbarAction.bind(this) }/>
            </div>
          </div>
        </div>
      );
    });
  }
}

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

const LayoutQuery = gql`
  query LayoutQuery { 

    viewer {
      user {
        type
        id
        title
      }

      group {
        type
        id
        title

        projects {
          type
          id
          type
          title
        }
      }

      folders {
        type
        id
        alias
        title
        icon
      }
    }
  }
`;

const mapStateToProps = (state, ownProps) => {
  let { injector } = AppAction.getState(state);

  // Required by Mutator.
  let idGenerator = injector.get(IdGenerator);

  return {
    idGenerator
  }
};

export default compose(

  connect(mapStateToProps),

  // Configure query (from redux state).
  // http://dev.apollodata.com/react/queries.html#graphql-options
  graphql(LayoutQuery, {
    props: ({ ownProps, data }) => {
      return _.pick(data, ['loading', 'error', 'viewer'])
    }
  }),

  //
  // TODO(burdon): Move to Activity and provide for entire stack.
  //
  Mutator.graphql(UpdateItemsMutation)

)(BaseLayout);
