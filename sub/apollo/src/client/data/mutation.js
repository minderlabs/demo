//
// Copyright 2016 Minder Labs.
//

'use strict';

import gql from 'graphql-tag';

//
// Mutations.
// TODO(burdon): Move to sub/graphql? (Apollo dependency).
//

export const UpdateItemMutation = gql`
  mutation UpdateItemMutation($itemId: ID!, $mutations: [ObjectMutationInput]!) {
    
    updateItem(itemId: $itemId, mutations: $mutations) {
      id
      type,
      labels
      title
    }
  }
`;
