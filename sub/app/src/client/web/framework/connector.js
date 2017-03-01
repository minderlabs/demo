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

/**
 * Redux and Apollo provide a withRef option to enable access to the contained component.
 * This cascades down through the connect() chain, so depending on how deeply nested the components are,
 * getWrappedInstance() needs to be called multiple times.
 *
 * @param hoc Higher-Order Component (Redux container).
 */
export const getWrappedList = function(hoc) {

  // TODO(burdon): Iterate layers.
  // TODO(burdon): Move to minder-core. Document why it might be needed. (via refs?)

  // https://github.com/apollostack/react-apollo/issues/118
  // http://dev.apollodata.com/react/higher-order-components.html#with-ref
  // https://github.com/reactjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options
  return hoc.getWrappedInstance().getWrappedInstance().getWrappedInstance();
};
