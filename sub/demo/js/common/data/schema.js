//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

//
// Server-side code that generates the JSON schema used by the client.
// https://github.com/facebook/graphql
//

// TODO(burdon): Fix debugging (errors getting swallowed).

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
  toGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
} from 'graphql-relay';

import {
  Database,
  Item,
  User
} from './database';

//
// NOTE: The Database.singleton decouples database implementation dependencies (e.g., lodash) from the schema defs.
// This is required since babel requires the schema (but not the implementation) to generate the schema.json file.
// The singleton instance is instantiated in the server.
//

const NODE_TYPE_REGISTRY = new Map();

/**
 * Determines node type of object instance.
 *
 * Used by GraphQL internals when resolving generics (interfaces and unions).
 * https://medium.com/the-graphqlhub/graphql-tour-interfaces-and-unions-7dd5be35de0d
 */
const resolveNodeType = (obj) => {
  for (let [ clazz, type ] of NODE_TYPE_REGISTRY.entries()) {
    if (obj instanceof clazz) {
      return type;
    }
  }

  return null;
};

/**
 * Retrieve object from global ID.
 * NOTE: Global IDs must be unique across types.
 * https://facebook.github.io/relay/docs/graphql-object-identification.html
 */
const resolveNodeFromGlobalId = (globalId) => {
  let { type, id } = fromGlobalId(globalId);
  console.log(`Resolve(${type}:${id})`);

  switch (type) {
    case User.KIND:
      return Database.singleton.getUser(id);

    case Item.KIND:
      return Database.singleton.getItem(id);

    default:
      throw 'Invalid type: ' + type;
  }
};

/**
 * Relay Node interface. Maps objects to types, and global IDs to objects.
 * https://facebook.github.io/relay/docs/tutorial.html
 */
const { nodeInterface, nodeField } = nodeDefinitions(
  resolveNodeFromGlobalId,
  resolveNodeType
);

//
// Node type definitions.
//

/**
 * User node type.
 */
const UserType = new GraphQLObjectType({
  name: User.KIND,
  interfaces: [ nodeInterface ],

  fields: () => ({
    id: globalIdField(UserType.name),

    title: {
      type: GraphQLString,
      description: 'User\'s name.',
      resolve: (item) => item.title
    },

    searchItems: {
      type: new GraphQLList(ItemType),
      args: {
        text: { type: new GraphQLNonNull(GraphQLString) }
      },
      resolve: (parent, args) => {
        return Database.singleton.searchItems(parent.id, args.text);
      }
    }
  })
});

/**
 * Item node type.
 */
const ItemType = new GraphQLObjectType({
  name: Item.KIND,
  resolveType: resolveNodeType,

  fields: () => ({
    id: globalIdField(ItemType.name),
    type: {
      type: GraphQLString,
      description: 'Primary type of this item.',
      resolve: (item, args) => item.type
    },
    version: {
      type: GraphQLInt,
      description: 'Version incremented after each mutation (on the server).',
      resolve: (item, args) => item.version
    },

    title: {
      type: GraphQLString,
      resolve: (item, args) => item.title
    },
    labels: {
      type: new GraphQLList(GraphQLString),
      resolve: (item, args) => item.labels
    },

    snippet: {
      type: GraphQLString,
      args: {
        text: { type: GraphQLString }
      },
      resolve: (item, args) => item.snippet(args.text)
    },

    data: {
      type: TypeUnion,
      resolve: (item, args) => {
        return item.data;
      }
    }
  })
});

//
// Node Type Registry.
//

NODE_TYPE_REGISTRY.set(User, UserType);
NODE_TYPE_REGISTRY.set(Item, ItemType);

//
// Item data types.
//

const TaskType = new GraphQLObjectType({
  name: 'Task',
  interfaces: [ nodeInterface ],

  fields: () => ({
    id: globalIdField(TaskType.name),

    priority: {
      type: GraphQLInt,
      resolve: (data) => {
        return data.priority;
      }
    },

    // assignedByUser: {
    //   type: GraphQLID,
    //   resolve: (item, args) => resolveNodeFromGlobalId(item.data.assignedByUserId)    // TODO(burdon): userId!!!
    // },
    //
    // assignedToUser: {
    //   type: GraphQLID,
    //   resolve: (item, args) => resolveNodeFromGlobalId(item.data.assignedToUserId)    // TODO(burdon): userId!!!
    // }
  })
});

const NoteType = new GraphQLObjectType({
  name: 'Note',
  interfaces: [ nodeInterface ],

  fields: () => ({
    id: globalIdField(NoteType.name),

    content: {
      type: GraphQLString,
      description: 'Content in markdown (or html?)',
      resolve: (data) => data.content
    }
  })
});

/**
 * Union of data types.
 * http://graphql.org/graphql-js/type/#graphqluniontype
 * https://medium.com/the-graphqlhub/graphql-tour-interfaces-and-unions-7dd5be35de0d#.sof4i67f1
 */
const TypeUnion = new GraphQLUnionType({
  name: 'TypeUnion',
  description: 'Base type for all data types.',
  types: [
    NoteType,
    TaskType
  ],

  resolveType: (data) => {
    switch (data.type) {
      case NoteType.name:
        return NoteType;

      case TaskType.name:
        return TaskType;

      default:
        throw 'Invalid data type: ' + data.type;
    }
  },

  fields: () => ({
    snippet: {
      type: GraphQLString,
      args: {
        text: { type: GraphQLString }
      }
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
// Node Mutations
//

const CreateItemMutation = mutationWithClientMutationId({
  name: 'CreateItemMutation',

  inputFields: {
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },

    type: {
      type: new GraphQLNonNull(GraphQLString)
    },

    title: {
      type: new GraphQLNonNull(GraphQLString)
    },

    labels: {
      type: new GraphQLList(GraphQLString)
    },

    // data: {
    //   type: TypeUnion
    // }
  },

  outputFields: {
    user: {
      type: UserType,
      resolve: ({ userId }) => resolveNodeFromGlobalId(userId)
    },

    item: {
      type: ItemType,
      resolve: ({ itemId }) => resolveNodeFromGlobalId(itemId)
    }
  },

  mutateAndGetPayload: ({ userId, type, title, labels }) => {
    let localUserId = fromGlobalId(userId).id;

    let item = Database.singleton.createItem(localUserId, type, {
      title: title,
      labels: labels
    });

    return {
      userId: userId,
      itemId: item.id
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

    title: {
      type: GraphQLString
    },

    labels: {
      type: StringListMutation
    }

    // TODO(burdon): Generalize ot ObjectMutation (like StringListMutation)?
    // data: {
    //   type: TypeUnion
    // }
  },

  outputFields: {
    item: {
      type: ItemType,
      resolve: ({ userId, itemId }) => {
        return resolveNodeFromGlobalId(itemId);
      }
    }
  },

  mutateAndGetPayload: ({ userId, itemId, title, labels }) => {
    let localUserId = fromGlobalId(userId).id;
    let { type, id } = fromGlobalId(itemId);

    let item = Database.singleton.updateItem(id, {
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
    createItemMutation: CreateItemMutation,
    updateItemMutation: UpdateItemMutation
  })
});

//
// Root query type.
// All routes must start from one of these queries.
//

const RootQueryType = new GraphQLObjectType({
  name: 'Query',

  fields: () => ({
    node: nodeField,

    user: {
      type: UserType,
      args: {
        userId: { type: GraphQLID }
      },
      resolve: (parent, args) => resolveNodeFromGlobalId(args.userId)
    },

    item: {
      type: ItemType,
      args: {
        userId: { type: GraphQLID },
        itemId: { type: GraphQLID }
      },
      resolve: (parent, args) => resolveNodeFromGlobalId(args.itemId)
    }
  })
});

//
// Main schema.
// http://graphql.org/graphql-js/type/#schema
//

const schema = new GraphQLSchema({
  mutation: rootMutationType,
  query: RootQueryType
});

export default schema;
