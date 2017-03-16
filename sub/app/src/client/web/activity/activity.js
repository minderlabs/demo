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
  let { config, registration, injector } = appState;
  console.assert(registration, 'Not registered.');

  let idGenerator     = injector.get(IdGenerator);
  let typeRegistry    = injector.get(TypeRegistry);
  let queryRegistry   = injector.get(QueryRegistry);
  let eventHandler    = injector.get(EventHandler);
  let contextManager  = injector.get(ContextManager);

  // CRX Navigator opens in new window (overridden in mapDispatchToProps for web).
  let navigator = undefined;
  if (_.get(config, 'app.platform') === Const.PLATFORM.CRX) {
    navigator = new WindowNavigator(new PropertyProvider(appState, 'server'));
  }

  return {
    config,
    registration,

    idGenerator,
    typeRegistry,
    queryRegistry,
    eventHandler,

    contextManager,
    navigator
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

const ViewerQuery = gql`
  query ViewerQuery {

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
          labels
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

/**
 * Activity helper.
 * Activities are top-level components that set-up the context.
 * Rather than using inheritance this helper provides injectable Redux functions.
 */
export class Activity {

  /**
   * Connect properties for activities.
   */
  static connect = () => compose(

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
  );

  static childContextTypes = {
    config:           React.PropTypes.object,
    viewer:           React.PropTypes.object,
    registration:     React.PropTypes.object,
    typeRegistry:     React.PropTypes.object,
    queryRegistry:    React.PropTypes.object,
    eventHandler:     React.PropTypes.object,
    contextManager:   React.PropTypes.object,
    navigator:        React.PropTypes.object,
    mutator:          React.PropTypes.object
  };

  static getChildContext(props) {
    let {
      config,
      viewer,
      registration,
      typeRegistry,
      queryRegistry,
      eventHandler,
      contextManager,
      navigator,
      mutator
    } = props;

    console.assert(config);
    console.assert(viewer);
    console.assert(registration);
    console.assert(typeRegistry);
    console.assert(queryRegistry);
    console.assert(eventHandler);
    console.assert(contextManager);
    console.assert(navigator);
    console.assert(mutator);

    return {
      config,
      viewer,
      registration,
      typeRegistry,
      queryRegistry,
      eventHandler,
      contextManager,
      navigator,
      mutator
    };
  }
}
