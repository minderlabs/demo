//
// Copyright 2017 Minder Labs.
//

import React from 'react';

import { EventHandler, PropertyProvider, QueryRegistry } from 'minder-core';

import { Const } from '../../../common/defs';

import { Navigator, WindowNavigator } from '../../common/path';
import { AppAction } from '../../common/reducers';

import { TypeRegistry } from '../../web/framework/type_registry';

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
  };

  static getChildContext(props) {
    let { config, registration, typeRegistry, queryRegistry, eventHandler, navigator } = props;

    return {
      config,
      registration,
      typeRegistry,
      queryRegistry,
      eventHandler,
      navigator
    };
  }

  static mapStateToProps = (state, ownProps) => {
    let appState = AppAction.getState(state);
    let { config, registration, injector } = appState;

    let typeRegistry = injector.get(TypeRegistry);
    let queryRegistry = injector.get(QueryRegistry);
    let eventHandler = injector.get(EventHandler);

    let navigator = undefined;
    if (_.get(config, 'app.platform') === Const.PLATFORM.CRX) {
      let serverProvider = new PropertyProvider(appState, 'server');
      navigator = new WindowNavigator(serverProvider);
    }

    return {
      config,
      registration,
      typeRegistry,
      queryRegistry,
      eventHandler,
      navigator
    };
  };

  static mapDispatchToProps = (dispatch, ownProps) => {
    let { navigator } = ownProps;
    if (!navigator) {
      navigator = new Navigator(dispatch);
    }

    return {
      navigator
    };
  };
}
