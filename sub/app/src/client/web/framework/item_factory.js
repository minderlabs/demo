//
// Copyright 2016 Minder Labs.
//

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'react-apollo';

import { Matcher } from 'minder-core';

import { AppAction } from '../../common/reducers';

const mapStateToProps = (state, ownProps) => {
  let { injector, registration } = AppAction.getState(state);
  let { userId } = registration;

  let matcher = injector.get(Matcher);

  return {
    registration,

    // Required by graphql HOC.
    matcher,

    // Matcher's context (same as server).
    context: {
      userId
    }
  }
};

/**
 * The HOC wrapper provides the following properties:
 */
export const connectItemReducer = (itemReducer) => {
  console.assert(itemReducer);
  return compose(connect(mapStateToProps), itemReducer);
};
