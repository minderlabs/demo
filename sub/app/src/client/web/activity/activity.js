//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'react-apollo';

import { EventHandler, IdGenerator, Mutator, PropertyProvider, QueryRegistry } from 'minder-core';

import { Const } from '../../../common/defs';

import { Navigator, WindowNavigator } from '../../common/path';
import { AppAction, ContextAction } from '../../common/reducers';
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

  let idGenerator   = injector.get(IdGenerator);
  let typeRegistry  = injector.get(TypeRegistry);
  let queryRegistry = injector.get(QueryRegistry);
  let eventHandler  = injector.get(EventHandler);

  // CRX Navigator opens in new window (overridden in mapDispatchToProps for web).
  let navigator = undefined;
  if (_.get(config, 'app.platform') === Const.PLATFORM.CRX) {
    navigator = new WindowNavigator(new PropertyProvider(appState, 'server'));
  }

  // CRX app context.
  // TODO(burdon): Do we have to rebuild the entire stack every time the context changes? (Push down and update?)
  let contextManager = undefined;
  if (_.get(config, 'app.platform') === Const.PLATFORM.CRX) {
    let contextState = ContextAction.getState(state);
    contextManager = new ContextManager(idGenerator, contextState);
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
    connect(mapStateToProps, mapDispatchToProps, mergeProps),
    Mutator.graphql()
  );

  static childContextTypes = {
    config:           React.PropTypes.object,
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
      config, registration, typeRegistry, queryRegistry, eventHandler, contextManager, navigator, mutator
    } = props;

    return {
      config,
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
