//
// Copyright 2017 Minder Labs.
//

import gql from 'graphql-tag';

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
