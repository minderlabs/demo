//
// Copyright 2016 Minder Labs.
//

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

      # TODO(burdon): Add all mutation fragments.

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
    project {
      id
    }
  }
`;
