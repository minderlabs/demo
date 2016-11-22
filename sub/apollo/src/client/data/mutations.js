//
// Copyright 2016 Minder Labs.
//

'use strict';

import gql from 'graphql-tag';

// TODO(burdon): Move TypeRegistry to core (sans UX).
// TODO(burdon): Pass into mutation generator.
import TypeRegistry from '../view/component/type_registry';

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
