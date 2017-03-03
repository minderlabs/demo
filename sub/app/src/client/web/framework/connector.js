//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'react-apollo';

import { Matcher } from 'minder-core';

import { AppAction } from '../../common/reducers';

//-------------------------------------------------------------------------------------------------
// Connector required by reducers.
//-------------------------------------------------------------------------------------------------

const mapStateToProps = (state, ownProps) => {
  let { injector, registration } = AppAction.getState(state);
  let { groupId, userId } = registration;

  let matcher = injector.get(Matcher);

  return {

    // Required by HOC reducers.
    matcher,

    // Client registration
    registration,

    // Matcher's context (same as server).
    context: {
      groupId, userId
    }
  }
};

/**
 * HOC wrapper for list queries.
 *
 * Example:
 * const HOC = connectReducer(ItemReducer.graphql(ComponentQuery, ComponentReducer))(Component)
 */
export const connectReducer = (reducer) => {
  console.assert(reducer);
  return compose(

    // withRef provides Access component via getWrappedInstance()
    // http://dev.apollodata.com/react/higher-order-components.html#with-ref
    // https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options
    connect(mapStateToProps, null, null, { withRef: true }),

    reducer
  );
};