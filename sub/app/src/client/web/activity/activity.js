//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose, graphql } from 'react-apollo';
import gql from 'graphql-tag';

import { EventHandler, IdGenerator, Mutator, PropertyProvider, QueryRegistry } from 'minder-core';

import { Const } from '../../../common/defs';

import { Navigator, WindowNavigator } from '../../common/path';
import { AppAction } from '../../common/reducers';
import { Analytics } from '../../common/analytics';
import { ContextManager } from '../../common/context';

import { TypeRegistry } from '../../web/framework/type_registry';

//-------------------------------------------------------------------------------------------------
// Default Redux property providers for activities.
// Each Activity has custom props.params provided by the redux-router.
// https://github.com/reactjs/react-redux/blob/master/docs/api.md
//-------------------------------------------------------------------------------------------------

/**
 * Extract state for downstream HOC wrappers.
 */
const mapStateToProps = (state, ownProps) => {
  let appState = AppAction.getState(state);
  let { config, injector } = appState;

  let typeRegistry    = injector.get(TypeRegistry);
  let queryRegistry   = injector.get(QueryRegistry);
  let eventHandler    = injector.get(EventHandler);
  let contextManager  = injector.get(ContextManager);

  // TODO(burdon): Why is this here? Only accessed in reducer (not context).
  let analytics       = injector.get(Analytics.INJECTOR_KEY);

  let idGenerator     = injector.get(IdGenerator);

  // CRX Navigator opens in new window (overridden in mapDispatchToProps for web).
  let navigator = undefined;
  if (_.get(config, 'app.platform') === Const.PLATFORM.CRX) {
    navigator = new WindowNavigator(new PropertyProvider(appState, 'server'));
  }

  return {
    config,
    typeRegistry,
    queryRegistry,
    eventHandler,
    contextManager,
    navigator,

    analytics,

    idGenerator       // Required by Mutator
  };
};

/**
 * Global dispatchers.
 */
const mapDispatchToProps = (dispatch, ownProps) => {
  return {
    navigator: new Navigator(dispatch)
  }
};

/**
 * NOTE: mapDispatchToProps can't access state, so we merge here.
 * https://github.com/reactjs/react-redux/issues/237
 */
const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return _.defaults({}, ownProps, stateProps, dispatchProps);
};

//-------------------------------------------------------------------------------------------------
// HOC.
//-------------------------------------------------------------------------------------------------

// Top-level query provided in context.

const ViewerQuery = gql`
  query ViewerQuery {

    viewer {
      user {
        type
        id
        title
      }

      groups {
        type
        id
        title

        projects {
          type
          id
          type
          labels
          title
        }
      }
    }
  }
`;

/**
 * Activity helper.
 * Activities are top-level components that set-up the context.
 * Rather than using inheritance this helper provides injectable Redux functions.
 */
export class Activity {

  /**
   * Connect properties for activities.
   */
  static compose() {
    let connectors = [

      // Redux state.
      connect(mapStateToProps, mapDispatchToProps, mergeProps),

      // Apollo mutation.
      Mutator.graphql(),

      // Apollo viewer query.
      graphql(ViewerQuery, {
        props: ({ ownProps, data }) => {
          return _.pick(data, ['loading', 'error', 'viewer'])
        }
      })
    ];

    if (arguments) {
      connectors = _.concat(connectors, arguments);
    }

    return compose(... connectors);
  };

  static childContextTypes = {
    config:           React.PropTypes.object,
    typeRegistry:     React.PropTypes.object,
    queryRegistry:    React.PropTypes.object,
    eventHandler:     React.PropTypes.object,
    contextManager:   React.PropTypes.object,
    navigator:        React.PropTypes.object,
    mutator:          React.PropTypes.object,
    viewer:           React.PropTypes.object
  };

  static getChildContext(props) {
    let {
      config,
      typeRegistry,
      queryRegistry,
      eventHandler,
      contextManager,
      navigator,
      mutator,
      viewer
    } = props;

    console.assert(config);
    console.assert(typeRegistry);
    console.assert(queryRegistry);
    console.assert(eventHandler);
    console.assert(contextManager);
    console.assert(navigator);
    console.assert(mutator);

    return {
      config,
      typeRegistry,
      queryRegistry,
      eventHandler,
      contextManager,
      navigator,
      mutator,
      viewer
    };
  }
}
