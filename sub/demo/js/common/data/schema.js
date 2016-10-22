//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

//
// Server-side code that generates the JSON schema used by the client.
// https://github.com/facebook/graphql
//

import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
} from 'graphql';

import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
  cursorForObjectInConnection,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
} from 'graphql-relay';

import {
  Database,
  Note,
  Task,
  User
} from './database';

//
// NOTE: The Database.singleton decouples database implementation dependencies (e.g., lodash) from the schema defs.
// This is required since babel requires the schema (but not the implementation) to generate the schema.json file.
// The singleton instance is instantiated in the server.
//

const TYPE_REGISTRY = new Map();

/**
 * Determines node type of object instance.
 *
 * Used by GraphQL internals when resolving generics (interfaces and unions).
 * https://medium.com/the-graphqlhub/graphql-tour-interfaces-and-unions-7dd5be35de0d
 */
const resolveType = (obj) => {
  for (let [ clazz, type ] of TYPE_REGISTRY.entries()) {
    if (obj instanceof clazz) {
      return type;
    }
  }

  return null;
};

/**
 * Retrieve object from global ID.
 * NOTE: Global IDs must be unique across types.
 */
const resolveItemFromGlobalId = (globalId) => {
  let { type, id } = fromGlobalId(globalId);
  return Database.singleton.getItem(type, id);
};

/**
 * Relay Node interface. Maps objects to types, and global IDs to objects.
 * https://facebook.github.io/relay/docs/tutorial.html
 */
const { nodeInterface, nodeField } = nodeDefinitions(
  resolveItemFromGlobalId,
  resolveType
);

//
// Interfaces
//

const ItemInterface = new GraphQLInterfaceType({
  name: 'ItemInterface',
  description: 'Base type for all data items.',
  resolveType: resolveType,

  fields: () => ({
    id: globalIdField(),
    type: {
      type: GraphQLString,
      description: 'Primary type of this item.'
    },
    version: {
      type: GraphQLInt,
      description: 'Version stamp, incremented after each mutation (on the server).'
    },
    title: {
      type: GraphQLString
    },
    labels: {
      type: new GraphQLList(GraphQLString)
    }
  })
});

/**
 * Searchable.
 * Interface for search results.
 * https://medium.com/the-graphqlhub/graphql-tour-interfaces-and-unions-7dd5be35de0d#.sof4i67f1
 */
const SearchableInterface = new GraphQLInterfaceType({
  name: 'Searchable',
  description: 'A searchable type.',
  resolveType: resolveType,

  fields: () => ({
    id: globalIdField(),
    type: {
      type: GraphQLString,
      description: 'Primary type of this item.'
    },
    title: {
      type: GraphQLString
    },
    snippet: {
      type: GraphQLString,
      args: {
        text: { type: GraphQLString }
      }
    }
  })
});

//
// User type definitions.
// https://facebook.github.io/relay/docs/graphql-object-identification.html
//

const UserType = new GraphQLObjectType({
  name: 'User',
  description: 'A user account.',
  interfaces: [ nodeInterface ],
  fields: () => ({
    id: globalIdField('User'),

    // TODO(burdon): Rename username (NOTE: backend implementation could model users as Items).
    title: {
      type: GraphQLString,
      description: 'User\'s name.',
      resolve: (item) => item.title
    },

    searchItems: {
      type: new GraphQLList(ItemInterface),
      args: {
        text: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve: (parent, args) => {
        return Database.singleton.searchItems(args.text);
      }
    },

    // TODO(burdon): Obsolete (replace with searchItems? Otherwise what are the semantics? assignedBy assignedTo?)
    tasks: {
      type: TaskConnection,
      description: 'User\'s collection of tasks.',
      args: connectionArgs,
      resolve: (user, args) => connectionFromArray(Database.singleton.getTasks(user.id, args), args)
    }
  })
});

// TODO(burdon): Union of inner types or interface?
// http://graphql.org/graphql-js/type/#graphqluniontype
// http://graphql.org/graphql-js/type/#graphqlinterfacetype

const TaskType = new GraphQLObjectType({
  name: 'Task',
  interfaces: [ nodeInterface, ItemInterface, SearchableInterface ],
  fields: () => ({
    id: globalIdField('Task'),

    //
    // ItemInterface
    // TODO(burdon): Extend base ItemType.
    //

    type: {
      type: GraphQLString,
      resolve: (item) => 'item'           // TODO(burdon): itemType.name?
    },

    version: {
      type: GraphQLInt,
      resolve: (item) => item.version
    },

    title: {
      type: GraphQLString,
      resolve: (item) => item.title
    },

    labels: {
      type: new GraphQLList(GraphQLString),
      resolve: (item) => item.labels
    },

    //
    // SearchableInterface
    //

    snippet: {
      type: GraphQLString,
      args: {
        text: { type: GraphQLString }
      },
      resolve: (item, args) => item.computeSnippet(args.text)
    }

    //
    // Type-specific
    //

    // TODO(burdon): Assigned to/by.
  })
});

const NoteType = new GraphQLObjectType({
  name: 'Note',
  interfaces: [ nodeInterface, ItemInterface, SearchableInterface ],
  fields: () => ({
    id: globalIdField('Note'),

    //
    // ItemInterface
    // TODO(burdon): Extend base ItemType.
    //

    type: {
      type: GraphQLString,
      resolve: (item) => 'note'           // TODO(burdon): itemType.name?
    },

    version: {
      type: GraphQLInt,
      resolve: (item) => item.version
    },

    title: {
      type: GraphQLString,
      resolve: (item) => item.title
    },

    labels: {
      type: new GraphQLList(GraphQLString),
      resolve: (item) => item.labels
    },

    //
    // SearchableInterface
    //

    snippet: {
      type: GraphQLString,
      args: {
        text: { type: GraphQLString }
      },
      resolve: (item, args) => item.computeSnippet(args.text)
    },

    //
    // Type-specific
    //

    content: {
      type: GraphQLString,
      description: 'Content in markdown (or html?)',
      resolve: (node) => node.content
    }
  })
});

//
// Type Registry.
//

TYPE_REGISTRY.set(User, UserType);
TYPE_REGISTRY.set(Task, TaskType);
TYPE_REGISTRY.set(Note, NoteType);

//
// TODO(burdon): Document.
// https://github.com/graphql/graphql-relay-js#connections
// https://facebook.github.io/relay/graphql/connections.htm
//

const {
  connectionType: TaskConnection,       // TODO(burdon): These defs are not used?
  edgeType: TaskEdge
} = connectionDefinitions({
  name: 'Task',
  nodeType: TaskType
});

//
// Root query type.
//

const RootQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({

    node: nodeField,

    search: {
      type: new GraphQLList(SearchableInterface),
      args: {
        text: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve: (parent, args) => {
        return Database.singleton.searchItems(args.text);
      }
    },

    user: {
      type: UserType,
      args: {
        userId: { type: GraphQLID }
      },
      resolve: (parent, args) => {
        return resolveItemFromGlobalId(args.userId)
      }
    },

    item: {
      type: ItemInterface,
      args: {
        userId: { type: GraphQLID },
        itemId: { type: GraphQLID }
      },
      resolve: (parent, args) => resolveItemFromGlobalId(args.itemId)
    },

    items: {
      type: TaskType,
      args: {
        userId: { type: GraphQLID }
      },
      resolve: (parent, args) => Database.singleton.getTasks(fromGlobalId(args.userId).id)
    }
  })
});

//
// Field Mutations
//

/**
 * List/Set Mutation
 * E.g., [{ value: '_favorite' }, { index: -1, value: 'inbox' }]
 */
const StringListMutation = new GraphQLList(new GraphQLInputObjectType({
  name: 'StringListMutation',

  fields: () => ({
    index: { type: GraphQLInt, defaultValue: 0 },           // -1 => remove
    value: { type: new GraphQLNonNull(GraphQLString) }
  })
}));

//
// Mutations
//

const CreateTaskMutation = mutationWithClientMutationId({
  name: 'CreateTaskMutation',

  inputFields: {
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },

    title: {
      type: new GraphQLNonNull(GraphQLString)
    },

    labels: {
      type: new GraphQLList(GraphQLString)
    }
  },

  outputFields: {
    user: {
      type: UserType,
      resolve: ({ userId }) => resolveItemFromGlobalId(userId)
    },

    taskEdge: {
      type: TaskEdge,
      resolve: ({ userId, taskId }) => {
        let task = Database.singleton.getTask(taskId);
        let localUserId = fromGlobalId(userId).id;

        return {
          node: task,

          // TODO(burdon): Do we need to retrieve all items here?
          cursor: cursorForObjectInConnection(
            Database.singleton.getTasks(localUserId),
            task
          )
        }
      }
    },
  },

  mutateAndGetPayload: ({ userId, title, labels }) => {
    let localUserId = fromGlobalId(userId).id;

    let task = Database.singleton.createTask(localUserId, {
      title: title,
      labels: labels
    });

    return {
      userId: userId,
      taskId: task.id
    };
  }
});

/**
 * Update item.
 */
const UpdateItemMutation = mutationWithClientMutationId({
  name: 'UpdateItemMutation',

  inputFields: {
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },

    itemId: {
      type: new GraphQLNonNull(GraphQLID)
    },

    // TODO(burdon): Generalize ot ObjectMutation (like StringListMutation)?

    title: {
      type: GraphQLString
    },

    labels: {
      type: StringListMutation
    }
  },

  outputFields: {
    item: {
      type: ItemInterface,
      resolve: ({ userId, itemId }) => {
        return resolveItemFromGlobalId(itemId);
      }
    }
  },

  mutateAndGetPayload: ({ userId, itemId, title, labels }) => {
    let localUserId = fromGlobalId(userId).id;
    let { type, id } = fromGlobalId(itemId);

    let item = Database.singleton.updateItem(type, id, {
      title: title,
      labels: labels
    });

    return {
      userId: localUserId,
      itemId: itemId
    };
  }
});

//
// Root mutation type.
//

const rootMutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    createTaskMutation: CreateTaskMutation,
    updateItemMutation: UpdateItemMutation
  })
});

//
// Main schema.
// http://graphql.org/graphql-js/type/#schema
//

const schema = new GraphQLSchema({
  types: [TaskType, NoteType], // Needed for resolving interface generics.
  query: RootQueryType,
  mutation: rootMutationType
});

export default schema;
