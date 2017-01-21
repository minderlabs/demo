//
// Copyright 2016 Minder Labs.
//

import gql from 'graphql-tag';

import {
  ItemFragment,
  ProjectBoardFragment,
  ProjectTasksFragment,
  TaskFragment,
  ValueFragment
} from 'minder-core';

// TODO(burdon): Refine fragments returned by mutation.
// NOTE: When the Project Detail card adds a new Task, unless "on Project { tasks {} }" is
// declared in the mutation, then thhe Project Board canvas will not be updated.

/**
 * Upsert item.
 */
export const UpdateItemMutation = gql`
  mutation UpdateItemMutation($itemId: ID!, $mutations: [ObjectMutationInput]!) {
    updateItem(itemId: $itemId, mutations: $mutations) {
      ...ItemFragment
      ...TaskFragment
      ...ProjectBoardFragment
    }
  }
  
  ${ValueFragment}

  ${ItemFragment}
  ${ProjectBoardFragment}
  ${ProjectTasksFragment}
  ${TaskFragment}
`;
