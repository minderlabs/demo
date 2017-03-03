//
// Copyright 2017 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';

import { EventHandler, IdGenerator, PropertyProvider, QueryRegistry } from 'minder-core';

import { Const } from '../../../common/defs';

import { Navigator, WindowNavigator } from '../../common/path';
import { AppAction } from '../../common/reducers';

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
  // TODO(burdon): Is this too expensive?
  return _.assign({}, ownProps, dispatchProps, stateProps);
};

/**
 * Activity helper.
 * Activities are top-level components that set-up the context.
 * Rather than using inheritance this helper provides injectable Redux functions.
 */
export class Activity {

  static childContextTypes = {
    config:         React.PropTypes.object,
    registration:   React.PropTypes.object,
    typeRegistry:   React.PropTypes.object,
    queryRegistry:  React.PropTypes.object,
    eventHandler:   React.PropTypes.object,
    navigator:      React.PropTypes.object,
    mutator:        React.PropTypes.object
  };

  static getChildContext(props) {
    let { config, registration, typeRegistry, queryRegistry, eventHandler, navigator, mutator } = props;

    return {
      config,
      registration,
      typeRegistry,
      queryRegistry,
      eventHandler,
      navigator,
      mutator
    };
  }

  /**
   * Connect properties for activities.
   */
  static connect = () => connect(mapStateToProps, mapDispatchToProps, mergeProps);
}
