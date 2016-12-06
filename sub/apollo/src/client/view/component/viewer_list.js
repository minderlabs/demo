//
// Copyright 2016 Minder Labs.
//

'use strict';

import React from 'react';
import { connect } from 'react-redux';
import gql from 'graphql-tag';

import { composeListForQuery } from './list';

import './list.less';

//
// Queries
//

/**
 * A List component with items defined by query for viewer.user.tasks.
 */

// TODO(madadam): Pagination (offset/count) for user.tasks.
const ItemsQuery = gql`
    query ItemsQuery($filter: FilterInput) {

        viewer {
            id
            
            user {
                id
                tasks(filter: $filter) {
                    __typename
                    
                    id
                    
                    ...ItemFragment
                }
            }
        }
    }
`;

export default composeListForQuery(
  ItemsQuery,

  // getItemsFromData
  (data) => {
      return (data.viewer && data.viewer.user && data.viewer.user.tasks) || [];
  });
