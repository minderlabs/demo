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

//
// Minimal Item fields.
//
const ItemMetaFragment = gql`
  fragment ItemMetaFragment on Item {
    bucket
    type
    id
    
    title
  }
`;

// TODO(burdon): Non-external fragment defs?

const UserTasksFragment = gql`
  fragment UserTasksFragment on User {
    email

    groups {
      ...ItemMetaFragment

      projects {
        ...ItemMetaFragment

        labels

        tasks {
          ...ItemMetaFragment

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

  ${ItemMetaFragment}
`;

export const Fragments = {

  //
  // TODO(burdon): Move to Query const.
  // ViewerQuery is requested by each Activity; the cached response is used by various Redux connectors.
  //

  ViewerQuery: gql`
    query ViewerQuery {
  
      viewer {
        user {
          ...ItemMetaFragment
        }
  
        groups {
          ...ItemMetaFragment
  
          projects {
            ...ItemMetaFragment
            labels
          }
        }
      }
    }

    ${ItemMetaFragment}
  `,

  // TODO(burdon): Warning: fragment with name ItemFragment already exists.
  ItemFragment: gql`
    fragment ItemFragment on Item {
      ...ItemMetaFragment

      namespace
      fkey
      labels

      description
    }
    
    ${ItemMetaFragment}
  `,

  //
  // Item Types.
  //

  ContactFragment: gql`
    fragment ContactFragment on Contact {
      email
      fkey

      tasks {
        ...ItemMetaFragment
        status
      }
    }
    
    ${ItemMetaFragment}
  `,

  ContactTasksFragment: gql`
    fragment ContactTasksFragment on Contact {
      email

      tasks {
        ...ItemMetaFragment
        status
      }

      user {
        ...UserTasksFragment
      }
    }

    ${ItemMetaFragment}
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
        ...ItemMetaFragment
        email
      }

      projects {
        ...ItemMetaFragment
      }
    }

    ${ItemMetaFragment}
  `,

  TaskFragment: gql`
    fragment TaskFragment on Task {
      ...ItemMetaFragment
  
      project {
        ...ItemMetaFragment
      }
  
      owner {
        ...ItemMetaFragment
      }

      assignee {
        ...ItemMetaFragment
      }
  
      status
  
      tasks {
        ...ItemMetaFragment
        status
      }
    }

    ${ItemMetaFragment}
  `,

  ProjectFragment: gql`
    fragment ProjectFragment on Project {
  
      tasks {
        ...ItemMetaFragment
        status
      }
    }

    ${ItemMetaFragment}
  `,

  ProjectBoardFragment: gql`
    fragment ProjectBoardFragment on Project {
      boards {
        alias

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
        ...ItemMetaFragment
        status
      }
  
      assigneeTasks: tasks(filter: { expr: { field: "assignee", ref: "id" } }) {
        ...ItemMetaFragment
        status
      }
    }

    ${ItemMetaFragment}
  `
};