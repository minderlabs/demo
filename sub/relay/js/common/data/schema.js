//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

//
// Server-side code that generates the JSON schema used by the client.
//
// http://graphql.org
// https://facebook.github.io/relay
// https://github.com/facebook/graphql
// https://github.com/relayjs/relay-examples/blob/master (Examples)
//

// TODO(burdon): Caching
// https://github.com/facebook/relay/wiki/Frequently-Asked-Questions
// https://github.com/facebook/relay/issues/720#issuecomment-174050321
// https://facebook.github.io/relay/docs/thinking-in-graphql.html#content

import _ from 'lodash';

import {
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  GraphQLUnionType,
} from 'graphql';

import {
  DirectiveLocation,
  GraphQLDirective
} from 'graphql/type/directives';

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

import UnionInputType from 'graphql-union-input-type';

import {
  Database,
  Item,
  Viewer
} from './database';


// NOTE: Needed so that the webpack client has a dependency for schema changes.
export const VERSION = '0.0.1';


//
// Directives.
// TODO(burdon): Implement cue for subscriptions.
// https://medium.com/the-graphqlhub/graphql-tour-directives-558dee4fa903#.ex7wj11dp
// https://medium.com/front-end-developers/graphql-directives-3dec6106c384#.iapv99yy0
//
// items(first: 10, filter: $filter) @subscription { ... }
//

export const SubscriptionDirective = new GraphQLDirective({
  name: 'subscription',
  description: 'Determines scope for subscriptions.',
  locations: [
    DirectiveLocation.FRAGMENT_DEFINITION
  ]
});


//
// NOTE: The Database.singleton decouples database implementation dependencies (e.g., lodash) from the schema defs.
// This is required since babel requires the schema (but not the implementation) to generate the schema.json file.
// The singleton instance is instantiated in the server.
//

/**
 * Retrieve object from global ID.
 * NOTE: Global IDs must be unique across types.
 * https://facebook.github.io/relay/docs/graphql-object-identification.html
 */
const resolveNodeFromGlobalId = (globalId) => {
  let { type, id } = fromGlobalId(globalId);
  console.log(`RESOLVE.ID: [${type}:${id}]`);

  let node = null;
  switch (type) {

    case Viewer.KIND:
      node = Database.singleton.getViewer(id);
      break;

    case Item.KIND:
      // TODO(burdon): Require bucketId?
      // TODO(burdon): Hack: return empty item (not null) for unrecognized items (i.e., during create process).
      node = Database.singleton.getItem(id);
      break;

    default:
      throw 'Invalid type: ' + type;
  }

  return node;
};

const NODE_TYPE_REGISTRY = new Map();

/**
 * Determines node type of object instance.
 *
 * Used by GraphQL internals when resolving generics (interfaces and unions).
 */
const resolveNodeType = (node) => {
  console.log('RESOLVE.TYPE: [%s]', node.id);

  // TODO(burdon): Don't depend on Database implementation. Get from property?
  for (let [ clazz, type ] of NODE_TYPE_REGISTRY.entries()) {
    if (node instanceof clazz) {
      return type;
    }
  }

  throw 'Invalid node type: ' + node;
};

/**
 * Relay Node interface. Maps objects to types, and global IDs to objects.
 * NOTE: Requires truly global ID (across buckets). Which requires a global index (how to partition? make secure?)
 *
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
 * Used to parameterize filtering items.
 */
const ItemFilterType = new GraphQLObjectType({
  name: 'ItemFilterType',

  fields: () => ({
    type: {
      type: GraphQLString
    },
    labels: {
      type: new GraphQLList(GraphQLString)
    },
    text: {
      type: GraphQLString
    },
    matchText: {
      type: GraphQLBoolean,
      description: 'If set the query must match the text.'
    }
  })
});

/**
 * Node that represents the context for the current user.
 */
const ViewerType = new GraphQLObjectType({
  name: Viewer.KIND,
  interfaces: [ nodeInterface ],

  fields: () => ({
    id: globalIdField(ViewerType.name),

    user: {
      type: ItemType,
      description: 'Item that represents the current user.',
      resolve: (user, args) => Database.singleton.getUser(user.id)
    },

    items: {
      type: ItemConnection,
      description: 'User\'s collection of items.',
      args: {
        ...connectionArgs,

        // Additional args.
        // https://facebook.github.io/relay/graphql/connections.htm#sec-Edge-Types
        // E.g., items(first: 10, filter: { type: "Task" }) { edges { node { id } } }
        filter: {
          type: getInputObject(ItemFilterType),
          description: 'Predicates to filter items.'
        }
      },
      resolve: (viewer, args) => {
        return connectionFromArray(Database.singleton.getItems(viewer.id, args.filter), args);
      }
    },

    folders: {
      type: new GraphQLList(ItemType),
      description: "List of folder items.",
      resolve: (user, args) => Database.singleton.getFolders(user.id)
    }
  })
});

/**
 * Item node type.
 */
const ItemType = new GraphQLObjectType({
  name: Item.KIND,
  interfaces: [ nodeInterface ],

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
      type: DataTypeUnion,
      resolve: (item, args) => {
        return item.data;
      },
    },

    items: {
      type: new GraphQLList(ItemType),
      args: {
        filter: {
          type: getInputObject(ItemFilterType),
          description: 'Predicates to filter items.'
        }
      },
      resolve: (viewer, args) => {
        return Database.singleton.getItems(viewer.id, args.filter);
      }
    }
  })
});

//
// Node Type Registry.
//

NODE_TYPE_REGISTRY.set(Viewer,  ViewerType);
NODE_TYPE_REGISTRY.set(Item,    ItemType);

//
// Connection Types.
// TODO(burdon): Document.
//
// https://github.com/graphql/graphql-relay-js#connections
// https://facebook.github.io/relay/graphql/connections.htm
// https://facebook.github.io/relay/docs/graphql-connections.html
//

const {
  connectionType: ItemConnection,
  edgeType: ItemEdge
} = connectionDefinitions({
  nodeType: ItemType
});

//
// Item data types.
//

// TODO(burdon): Change to node interface of DataType (modified ID from parent item).

const UserType = new GraphQLObjectType({
  name: 'User',

  fields: () => ({

    email: {
      type: GraphQLString,
      resolve: (data) => data.email
    }
  })
});

const GroupType = new GraphQLObjectType({
  name: 'Group',

  fields: () => ({

    // TODO(burdon): Items of type User?
    members: {
      type: new GraphQLList(ItemType),
      resolve: (data) => Database.singleton.getItemsById(data.members)
    }
  })
});

const FolderType = new GraphQLObjectType({
  name: 'Folder',

  fields: () => ({

    itemId: {
      type: GraphQLID,
      resolve: (data) => data.itemId,
      description: "ID of item if detail view."
    },

    path: {
      type: GraphQLString,
      resolve: (data) => data.path
    },

    filter: {
      type: ItemFilterType,
      resolve: (data) => data.filter
    }
  })
});

const TaskType = new GraphQLObjectType({
  name: 'Task',

  fields: () => ({

    priority: {
      type: GraphQLInt,
      resolve: (data) => data.priority
    },

    owner: {
      type: ItemType,
      resolve: (data) => data.owner && Database.singleton.getItem(data.owner)
    },

    assignee: {
      type: ItemType,
      resolve: (data) => data.assignee && Database.singleton.getItem(data.assignee)
    },

    details: {
      type: GraphQLString,
      description: 'Content in markdown (or html?)',
      resolve: (data) => data.details
    }
  })
});

const NoteType = new GraphQLObjectType({
  name: 'Note',

  fields: () => ({

    content: {
      type: GraphQLString,
      description: 'Content in markdown (or html?)',
      resolve: (data) => data.content
    }
  })
});

//
// Map of data types.
//

export const DATA_TYPE_MAP = new Map();

DATA_TYPE_MAP.set( GroupType.name, GroupType);
DATA_TYPE_MAP.set(  UserType.name, UserType);
DATA_TYPE_MAP.set(FolderType.name, FolderType);
DATA_TYPE_MAP.set(  NoteType.name, NoteType);
DATA_TYPE_MAP.set(  TaskType.name, TaskType);

const INPUT_TYPES = new Map();

/**
 * Convert GraphQLObjectType to GraphQLInputObjectType.
 * @param type
 */
function getInputObject(type) {

  // https://github.com/graphql/graphql-js/issues/207
  // https://github.com/graphql/graphql-js/issues/312
  // https://github.com/Cardinal90/graphql-union-input-type

  function convertInputObjectField(field) {
    let fieldType = field.type;

    const wrappers = [];
    while (fieldType.ofType) {
      wrappers.unshift(fieldType.constructor);
      fieldType = fieldType.ofType;
    }

    if (!(fieldType instanceof GraphQLInputObjectType ||
          fieldType instanceof GraphQLScalarType ||
          fieldType instanceof GraphQLEnumType)) {

      // TODO(burdon): Must be singletons?
      fieldType = fieldType.getInterfaces().includes(nodeInterface) ?
        GraphQLID : getInputObject(fieldType);
    }

    fieldType = wrappers.reduce((type, wrapper) => {
      return new wrapper(type);
    }, fieldType);

    return { type: fieldType };
  }

  let inputType = INPUT_TYPES.get(type);
  if (!inputType) {
    inputType = new GraphQLInputObjectType({
      name: type.name + 'Input',
      fields: _.mapValues(type.getFields(), field => convertInputObjectField(field))
    });

    INPUT_TYPES.set(type, inputType);
  }
  return inputType;
}

const DataInputTypeUnion = new UnionInputType({
  name: 'UnionInputType',
  inputTypes: _.map(Array.from(DATA_TYPE_MAP.values()), (type) => {
    return getInputObject(type);
  })
});

/**
 * Union of data types.
 *
 * http://graphql.org/graphql-js/type/#graphqluniontype
 * http://stackoverflow.com/questions/32558861/union-types-support-in-relay
 * https://medium.com/the-graphqlhub/graphql-tour-interfaces-and-unions-7dd5be35de0d#.sof4i67f1
 */
const DataTypeUnion = new GraphQLUnionType({   // TODO(burdon): Change to interface?
  name: 'DataTypeUnion',
  description: 'Base type for all data types.',
  types: Array.from(DATA_TYPE_MAP.values()),

  resolveType: (data) => {
    let type = DATA_TYPE_MAP.get(data.type);
    if (!type) {
      throw 'Invalid data type: ' + data.type;
    }

    return type;
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
// https://facebook.github.io/relay/docs/guides-mutations.html
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

    data: {
      type: DataInputTypeUnion
    }
  },

  outputFields: {
    viewer: { // TODO(burdon): Why is this needed as an output?
      type: ViewerType,
      resolve: ({ userId }) => resolveNodeFromGlobalId(userId)
    },

    itemEdge: {
      type: ItemEdge,
      resolve: ({ userId, itemId, type }) => {
        let item = Database.singleton.getItem(itemId);
        let { id: localUserId } = fromGlobalId(userId);

        // TODO(burdon): Need filter arg to return a meaningful cursor.
        // https://github.com/graphql/graphql-relay-js
        let items = Database.singleton.getItems(localUserId, { type: type });
        let cursor = cursorForObjectInConnection(items, item);

        return {
          node: item,
          cursor: cursor
        }
      }
    },
  },

  mutateAndGetPayload: ({ userId, type, title, labels, data }) => {
    let { id: localUserId } = fromGlobalId(userId);

    let item = Database.singleton.createItem(localUserId, type, {
      title: title,
      labels: labels,
      data: data
    });

    return {
      userId: userId,
      itemId: toGlobalId(Item.KIND, item.id),
      type: type
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
    },

    data: {
      type: DataInputTypeUnion
    }
  },

  outputFields: {
    viewer: { // TODO(burdon): Why is this needed as an output?
      type: ViewerType,
      resolve: ({ userId }) => resolveNodeFromGlobalId(userId)
    },

    item: {
      type: ItemType,
      resolve: ({ itemId }) => resolveNodeFromGlobalId(itemId)
    }
  },

  mutateAndGetPayload: ({ userId, itemId, title, labels, data }) => {
    let { id: localItemId } = fromGlobalId(itemId);

    let item = Database.singleton.updateItem(localItemId, {
      title: title,
      labels: labels,
      data: data
    });

    return {
      userId: userId,
      itemId: itemId
    };
  }
});

//
// Root mutation type.
//

const RootMutationType = new GraphQLObjectType({
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

  //
  // Used by Router queries to set-up state.
  //

  fields: () => ({
    node: nodeField,

    viewer: {
      type: ViewerType,
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

const Schema = new GraphQLSchema({
  directives: [
    SubscriptionDirective
  ],
  mutation: RootMutationType,
  query: RootQueryType
});

export default Schema;