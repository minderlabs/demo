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
  mutation UpdateItemMutation($itemId: ID!, $deltas: [ObjectDelta]!) {
    
    updateItem(itemId: $itemId, deltas: $deltas) {
      id
      type,
      labels
      title
    }
  }
`;
