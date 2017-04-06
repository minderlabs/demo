//
// Copyright 2017 Minder Labs.
//

import gql from 'graphql-tag';

// TODO(burdon): Refine fragments returned by mutation.
// TODO(burdon): Organize into slices.

// NOTE: When the Project Detail card adds a new Task, unless "on Project { tasks {} }" is
// declared in the mutation, then the Project Board canvas will not be updated.

const ValueFragment = gql`
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

// TODO(burdon): Move.
const UserTasksFragment = gql`
  fragment UserTasksFragment on User {
    email

    groups {
      type
      id
      title

      projects {
        bucket
        type
        id
        title
        labels

        tasks {
          type
          id
          title
          status
          owner {
            id
          }
          assignee {
            id
          }
        }
      }
    }
  }
`;

export const Fragments = {

  //
  // ViewerQuery is requested by each Activity; the cached response is used by various Redux connectors.
  //

  ViewerQuery: gql`
    query ViewerQuery {
  
      viewer {
        user {
          type
          id
          title
        }
  
        groups {
          type
          id
          title
  
          projects {
            bucket
            type
            id
            type
            labels
            title
          }
        }
      }
    }
  `,

  // TODO(burdon): Warning: fragment with name ItemFragment already exists.
  ItemFragment: gql`
    fragment ItemFragment on Item {
      namespace
      bucket
      type
      id
      fkey
      labels

      title
      description
    }
  `,

  //
  // Item Types.
  //

  ContactFragment: gql`
    fragment ContactFragment on Contact {
      email
      title
      fkey

      tasks {
        type
        id
        title
        status
      }
    }
  `,

  ContactTasksFragment: gql`
    fragment ContactTasksFragment on Contact {
      email

      tasks {
        type
        id
        title
        status
      }

      user {
        ...UserTasksFragment
      }
    }

    ${UserTasksFragment}
  `,

  // TODO(burdon): Move url, iconUrl to ItemFragment.
  DocumentFragment: gql`
    fragment DocumentFragment on Document {
      url
      iconUrl
    }
  `,

  GroupFragment: gql`
    fragment GroupFragment on Group {

      members {
        type
        id
        title
        email
      }

      projects {
        type
        id
        titlec
      }
    }
  `,

  TaskFragment: gql`
    fragment TaskFragment on Task {
  
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
  `,

  ProjectFragment: gql`
    fragment ProjectFragment on Project {
  
      # TODO(burdon): Potential collision with Task.tasks (for card search mixin).
      tasks {
        type
        id
        title
        status
      }
    }
  `,

  ProjectBoardFragment: gql`
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
  `,

  UserFragment: gql`
    fragment UserFragment on User {
      email
  
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
  `
};