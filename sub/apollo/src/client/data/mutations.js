//
// Copyright 2016 Minder Labs.
//

import gql from 'graphql-tag';

/**
 * Upsert item.
 */
export const UpdateItemMutation = gql`
  mutation UpdateItemMutation($itemId: ID!, $mutations: [ObjectMutationInput]!) {

    # TODO(burdon): Use ItemFragment here.
    updateItem(itemId: $itemId, mutations: $mutations) {
      bucket
      id
      type,
      labels
      title
      description

      # TODO(burdon): Add all mutation fragments.

      ...ProjectMutationFragment
      ...TaskMutationFragment
    }
  }
  
  # TODO(burdon): Factor out fragments.
  
  fragment ProjectMutationFragment on Project {
    boards {
      title
      columns {
        id
        title
        value {
          ...ValueFragment
        }
      }
      itemMeta {
        itemId, listId, order
      }
    }
  }
  
  fragment TaskMutationFragment on Task {
    bucket
    status
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
  
  fragment ValueFragment on Value {
    null
    int
    float
    string
    boolean
    id
    timestamp
    date
  }
`;
