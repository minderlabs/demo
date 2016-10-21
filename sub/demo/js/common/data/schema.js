//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

//
// Server-side code that generates the JSON schema used by the client.
// https://github.com/facebook/graphql
//

// TODO(burdon): PyCharm plugin.
// https://github.com/jimkyndemeyer/js-graphql-intellij-plugin/issues/32

// TODO(burdon): Checkout: https://github.com/chentsulin/awesome-graphql#lib-js

//
// NOTE: MUST REGEN WEBPACK BUNDLE AFTER UPDATING SCHEMA.
// TODO(burdon): Fix in webpack config? (temp fix: grunt watch).
// https://github.com/webpack/webpack/issues/2919
//

import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLInterfaceType,
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
  User,
  Task,
  Note,
  Database
} from './database';


//
// Main database instance.
// TODO(burdon): Use Data loader to do efficient entity look-ups on server (e.g., for RethinkDB/ORM layer).
// http://graphql.org/blog/rest-api-graphql-wrapper/#creating-a-data-loader
//

const database = new Database().init();

/**
 * Determines node type of object instance.
 *
 * Used by graphql internals when resolving generics (interfaces and unions).
 * https://medium.com/the-graphqlhub/graphql-tour-interfaces-and-unions-7dd5be35de0d
 */
// TODO(madadam): Investigate using isTypeOf in each type definition instead of this.
const resolveType = (obj) => {
  // TODO(burdon): Infer from something other than type? E.g. type string in Item interface.
  if (obj instanceof User) {
    return UserType;
  } else if (obj instanceof Task)  {
    return TaskType;
  } else if (obj instanceof Note)  {
    return NoteType;
  } else {
    return null;
  }
};

/**
 * Retrieve object from global ID.
 * NOTE: Global IDs must be unique across types.
 */
const getItemFromGlobalId = (globalId) => {
  let { type, id } = fromGlobalId(globalId);
  return database.getItem(type, id);
};

/**
 * Relay Node interface. Maps objects to types, and global IDs to objects.
 * https://facebook.github.io/relay/docs/tutorial.html
 */
const { nodeInterface, nodeField } = nodeDefinitions(
  getItemFromGlobalId,
  resolveType
);

const ItemInterface = new GraphQLInterfaceType({
  name: 'ItemInterface',
  description: 'The Item interface.',
  fields: () => ({
    id: globalIdField(),
    type: {
      type: GraphQLString,
      description: 'Primary type of this item.'
    },
    title: {
      type: GraphQLString
    },
    version: {
      type: GraphQLInt,
      description: 'Version stamp, incremented on every mutation.'
    },
    status: {
      type: GraphQLInt
    }
  }),
  resolveType: resolveType
});

/**
 * Searchable.
 * Interface for search results.
 */
// https://medium.com/the-graphqlhub/graphql-tour-interfaces-and-unions-7dd5be35de0d#.sof4i67f1
const SearchableInterface = new GraphQLInterfaceType({
  name: 'Searchable',
  description: 'A searchable type.',
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
  }),
  resolveType: resolveType
});


//
// Note type definitions.
// https://facebook.github.io/relay/docs/graphql-object-identification.html
//

const UserType = new GraphQLObjectType({
  name: 'User',
  description: 'A user account.',
  interfaces: [ nodeInterface ],
  fields: () => ({
    id: globalIdField('User'),

    // TODO(burdon): Standardize on "title" field in type definition?
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
        return database.searchItems(args.text);
      }
    },

    // TODO(burdon): Obsolete (replace with searchItems).
    tasks: {
      type: TaskConnection,
      description: 'User\'s collection of tasks.',
      args: connectionArgs,
      resolve: (user, args) => connectionFromArray(database.getTasks(user.id, args), args)
    }
  })
});

// TODO(burdon): Union of inner types or interface?
// http://graphql.org/graphql-js/type/#graphqluniontype
// http://graphql.org/graphql-js/type/#graphqlinterfacetype

const TaskType = new GraphQLObjectType({
  name: 'Task',
  description: 'An assignable task.',
  interfaces: [ nodeInterface, ItemInterface, SearchableInterface ],
  fields: () => ({
    id: globalIdField('Task'),

    // ItemInterface

    type: {
      type: GraphQLString,
      resolve: (item) => 'item'
    },

    title: {
      type: GraphQLString,
      resolve: (item) => item.title
    },

    version: {
      type: GraphQLInt,
      resolve: (item) => item.version
    },

    status: {
      type: GraphQLInt,
      resolve: (item) => item.status
    },

    // Interface Searchable
    snippet: {
      type: GraphQLString,
      args: {
        text: { type: GraphQLString }
      },
      resolve: (item, args) => item.computeSnippet(args.text)
    }
  })
});

const NoteType = new GraphQLObjectType({
  name: 'Note',
  description: 'A note.',
  interfaces: [ nodeInterface, ItemInterface, SearchableInterface ],
  fields: () => ({
    id: globalIdField('Note'),

    // Item Interface
    type: {
      type: GraphQLString,
      resolve: (item) => 'note'
    },

    title: {
      type: GraphQLString,
      description: 'Title.',
      resolve: (item) => item.title
    },

    version: {
      type: GraphQLInt,
      resolve: (item) => item.version
    },

    status: {
      type: GraphQLInt,
      resolve: (item) => item.status
    },

    // Searchable interface
    snippet: {
      type: GraphQLString,
      args: {
        text: { type: GraphQLString }
      },
      resolve: (item, args) => item.computeSnippet(args.text)
    },

    // Non-interface fields
    content: {
      type: GraphQLString,
      description: 'Content in markdown (or html?).',
      resolve: (node) => node.content
    }
  })
});

// TODO(burdon): Document.
const {
  connectionType: TaskConnection,
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
        return database.searchItems(args.text);
      }
    },

    user: {
      type: UserType,
      args: {
        userId: { type: GraphQLID }
      },
      resolve: (parent, args) => {
        return getItemFromGlobalId(args.userId)
      }
    },

    item: {
      type: ItemInterface,
      args: {
        userId: { type: GraphQLID },
        itemId: { type: GraphQLID }
      },
      resolve: (parent, args) => getItemFromGlobalId(args.itemId)
    },

    items: {
      type: TaskType,
      args: {
        userId: { type: GraphQLID }
      },
      resolve: (parent, args) => database.getTasks(fromGlobalId(args.userId).id)
    }
  })
});

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

    // TODO(burdon): Change to array of labels.
    status: {
      type: GraphQLInt
    }
  },

  outputFields: {
    user: {
      type: UserType,
      resolve: ({ userId }) => getItemFromGlobalId(userId)
    },

    taskEdge: {
      type: TaskEdge,
      resolve: ({ userId, taskId }) => {
        let task = database.getTask(taskId);
        const localUserId = fromGlobalId(userId).id;
        return {
          node: task,

          // TODO(burdon): Do we need to retrieve all items here?
          cursor: cursorForObjectInConnection(
            database.getTasks(localUserId),
            task
          )
        }
      }
    },
  },

  mutateAndGetPayload: ({ userId, title, status }) => {
    const localUserId = fromGlobalId(userId).id;

    let task = database.createTask(localUserId, {
      title: title,
      status: status
    });

    return {
      userId: userId,
      taskId: task.id
    };
  }
});

const UpdateItemMutation = mutationWithClientMutationId({
  name: 'UpdateItemMutation',

  inputFields: {
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },

    itemId: {
      type: new GraphQLNonNull(GraphQLID)
    },

    // TODO(burdon): Generalize? Pass in entire item? (Same issue for create above.)
    //               Or JSON object where each non-undefined field is to be set?
    title: {
      type: GraphQLString
    },

    // TODO(burdon): Change to array of labels.
    status: {
      type: GraphQLInt
    }
  },

  outputFields: {
    item: {
      type: ItemInterface,
      resolve: ({ userId, itemId }) => {
        return getItemFromGlobalId(itemId);
      }
    }
  },

  mutateAndGetPayload: ({ userId, itemId, title, status }) => {
    let localUserId = fromGlobalId(userId).id;
    const { type, id } = fromGlobalId(itemId);
    console.log('MUTATE ' + itemId + ' = ' + type + ':' + id);

    const item = database.updateItem(type, id, {
      title: title,
      status: status
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
// Main app schema.
// http://graphql.org/graphql-js/type/#schema
//

const schema = new GraphQLSchema({
  types: [TaskType, NoteType], // Needed for resolving interface generics.
  query: RootQueryType,
  mutation: rootMutationType
});

export default schema;
