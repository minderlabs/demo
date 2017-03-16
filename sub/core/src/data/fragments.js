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

// TODO(burdon): Create single exportable map.

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

// TODO(burdon): Warning: fragment with name ItemFragment already exists.
export const ItemFragment = gql`
  fragment ItemFragment on Item {
    namespace
    fkey
    bucket
    type
    id
    labels
    title
    description
  }
`;

export const ContactFragment = gql`
  fragment ContactFragment on Contact {
    email
    tasks {
      type
      id
      title
      status
    }
  }
`;

// TODO(burdon): Move url, iconUrl to ItemFragment
export const DocumentFragment = gql`
  fragment DocumentFragment on Document {
    url
    iconUrl
  }
`;

export const GroupFragment = gql`
  fragment GroupFragment on Group {
    id 
    members {
      type
      id
      title
      email
    }
    projects {
      type
      id
      title
    }
  }
`;

export const TaskFragment = gql`
  fragment TaskFragment on Task {
    bucket
    type
    id

    # TODO(burdon): Already in ItemFragment.
    title
    description

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

    status

    # TODO(burdon): Required for sub-task mutations.
    tasks {
      type
      id
      title
      status
    }
  }
`;

export const ProjectFragment = gql`
  fragment ProjectFragment on Project {

    # TODO(burdon): Potential collision with Task.tasks (for card search mixin).
    tasks {
      type
      id
      title
      status
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

export const UserFragment = gql`
  fragment UserFragment on User {
    title

    ownerTasks: tasks(filter: { expr: { field: "owner", ref: "id" } }) {
      type
      id
      title
      status
    }

    assigneeTasks: tasks(filter: { expr: { field: "assignee", ref: "id" } }) {
      type
      id
      title
      status
    }
  }
`;
