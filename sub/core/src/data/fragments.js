//
// Copyright 2017 Minder Labs.
//

import gql from 'graphql-tag';

// TODO(burdon): Factor out GQL component (mutations, etc.)
// TODO(burdon): Refine fragments returned by mutation.
// NOTE: When the Project Detail card adds a new Task, unless "on Project { tasks {} }" is
// declared in the mutation, then thhe Project Board canvas will not be updated.

//
// Canonical Query fragments (i.e., contain all fields).
//

export const ValueFragment = gql`
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

export const ItemFragment = gql`
  fragment ItemFragment on Item {
    bucket
    id
    type
    labels
    title
    description
  }
`;

export const DocumentFragment = gql`
  fragment DocumentFragment on Document {
    url
    iconUrl
    source
  }
`;

export const TaskFragment = gql`
  fragment TaskFragment on Task {
    bucket
    type
    id

    title
    description

    status
    project {
      id
      title
    }
    owner {
      id
      title
    }
    assignee {
      id
      title
    }
  }
`;

export const ProjectBoardFragment = gql`
  fragment ProjectBoardFragment on Project {
    boards {
      alias
      title
      columns {
        id
        title
        value {
          ...ValueFragment
        }
      }
      itemMeta {
        itemId
        listId
        order
      }
    }
  }

  ${ValueFragment}
`;

export const ProjectTasksFragment = gql`
  fragment ProjectBoardFragment on Project {
    tasks {
      ...TaskFragment
    }
  }

  ${TaskFragment}
`;

//
// Mutation fragments.
// TODO(burdon): Doc (fields that are returned from the server after the mutation).
//

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
