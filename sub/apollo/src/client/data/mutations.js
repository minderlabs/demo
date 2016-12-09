//
// Copyright 2016 Minder Labs.
//

'use strict';

import gql from 'graphql-tag';

/**
 * Upsert item.
 */
export const UpdateItemMutation = gql`
  mutation UpdateItemMutation($itemId: ID!, $mutations: [ObjectMutationInput]!) {
    
    updateItem(itemId: $itemId, mutations: $mutations) {
      id
      type,
      labels
      title

      ... TaskMutationFragment
    }
  }
  
  fragment TaskMutationFragment on Task {
    bucket
    owner {
      id
    }
    assignee {
      id
    }
  }
`;

// TODO(burdon): Get all mutation fragments.
// __typename
// ${_.map(TypeRegistry.names, (name) => '...' + name).join('\n')}
