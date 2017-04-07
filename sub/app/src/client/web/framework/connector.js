//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'react-apollo';

import { Fragments, Matcher } from 'minder-core';

import { AppAction } from '../../common/reducers';

//-------------------------------------------------------------------------------------------------
// Connector required by reducers.
//-------------------------------------------------------------------------------------------------

const mapStateToProps = (state, ownProps) => {
  let { injector, config, client } = AppAction.getState(state);

  let matcher = injector.get(Matcher);

  // Get from cache.
  const { viewer } = client.readQuery({
    query: Fragments.ViewerQuery
  });

  let userId = _.get(viewer, 'context.user.id');
  let buckets = _.map(_.get(viewer, 'groups'), group => group.id);

  return {

    // Required by HOC reducers.
    config,
    matcher,

    // Matcher's context used by HOC reducers.
    context: {
      userId,
      buckets
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
