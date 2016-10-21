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
  User,
  Item,
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
const resolveType = (obj) => {
  // TODO(madadam): Investigate using isTypeOf in each type definition instead of this.
  // TODO(burdon): Infer from something other than type? E.g. type string in Item interface.
  if (obj instanceof User) {
    return userType;
  } else if (obj instanceof Item)  {
    return itemType;
  } else if (obj instanceof Note)  {
    return noteType;
  } else {
    return null;
  }
};

/**
 * Relay Node interface. Maps objects to types, and global IDs to objects.
 * https://facebook.github.io/relay/docs/tutorial.html
 */
const { nodeInterface, nodeField } = nodeDefinitions(

  //
  // Retrieve object from global ID.
  // NOTE: Global IDs must be unique across types.
  //

  (globalId) => {
    let { type, id } = fromGlobalId(globalId);
    switch (type) {

      case 'User': {
        return database.getUser(id);
      }

      case 'Item': {
        return database.getItem(id);
      }

      default: {
        return null;
      }
    }
  },

  resolveType
);

//
// Interfaces
//

const ItemInterface = new GraphQLInterfaceType({
  name: 'ItemInterface',
  description: 'Base type for all data items.',
  fields: () => ({
    type: {
      type: GraphQLString
    },
    title: {
      type: GraphQLString
    },
    labels: {
      type: new GraphQLList(GraphQLString)
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
 * https://medium.com/the-graphqlhub/graphql-tour-interfaces-and-unions-7dd5be35de0d#.sof4i67f1
 */
const SearchableInterface = new GraphQLInterfaceType({
  name: 'Searchable',
  description: 'A searchable type.',
  fields: () => ({
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

const userType = new GraphQLObjectType({
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

    // TODO(burdon): Obsolete (replace with searchItems)?
    items: {
      type: ItemConnection,
      description: 'User\'s collection of items.',
      args: connectionArgs,
      resolve: (user, args) => connectionFromArray(database.getItems(user.id, args), args)
    }
  })
});

// TODO(burdon): Union of inner types or interface?
// http://graphql.org/graphql-js/type/#graphqluniontype
// http://graphql.org/graphql-js/type/#graphqlinterfacetype

// TODO(burdon): Upcase?
const itemType = new GraphQLObjectType({
  name: 'Item',
  description: 'A generic data item.',
  interfaces: [ nodeInterface, ItemInterface, SearchableInterface ],
  fields: () => ({
    id: globalIdField('Item'),

    version: {
      type: GraphQLInt,
      resolve: (item) => item.version
    },

    type: {
      type: GraphQLString,
      resolve: (item) => 'item'     // TODO(burdon): itemType.name?
    },

    title: {
      type: GraphQLString,
      resolve: (item) => item.title
    },

    labels: {
      type: new GraphQLList(GraphQLString),
      resolve: (item) => item.labels
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

const noteType = new GraphQLObjectType({
  name: 'Note',
  description: 'A note.', // TODO(burdon): Doc.
  interfaces: [ nodeInterface, ItemInterface, SearchableInterface ],
  fields: () => ({
    id: globalIdField('Note'),

    // Item Interface
    type: {
      type: GraphQLString,
      resolve: (item) => 'note'   // TODO(burdon): itemType.name?
    },

    title: {
      type: GraphQLString,
      resolve: (item) => item.title
    },

    labels: {
      type: new GraphQLList(GraphQLString),
      resolve: (item) => item.labels
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
      resolve: (node) => node.content
    }
  })
});

//
// TODO(burdon): Document.
// https://github.com/graphql/graphql-relay-js#connections
// https://facebook.github.io/relay/graphql/connections.htm
//

const {
  connectionType: ItemConnection,
  edgeType: ItemEdge
} = connectionDefinitions({
  name: 'Item',
  nodeType: itemType
});

//
// Root query type.
//

const rootQueryType = new GraphQLObjectType({
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
      type: userType,
      args: {
        userId: { type: GraphQLID }
      },
      resolve: (parent, args) => {
        return database.getUser(fromGlobalId(args.userId).id)
      }
    },

    item: {
      type: itemType,
      args: {
        userId: { type: GraphQLID },
        itemId: { type: GraphQLID }
      },
      resolve: (parent, args) => database.getItem(fromGlobalId(args.itemId).id)
    },

    items: {
      type: itemType,
      args: {
        userId: { type: GraphQLID }
      },
      resolve: (parent, args) => database.getItems(fromGlobalId(args.userId).id)
    }
  })
});

//
// Mutations
//

const CreateItemMutation = mutationWithClientMutationId({
  name: 'CreateItemMutation',

  inputFields: {
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    },

    title: {
      type: new GraphQLNonNull(GraphQLString)
    },

    labels: {
      type: new GraphQLList(GraphQLString)
    },

    // TODO(burdon): Type-specific?
    status: {
      type: GraphQLInt
    }
  },

  outputFields: {
    user: {
      type: userType,
      resolve: ({ userId }) => database.getUser(userId)
    },

    itemEdge: {
      type: ItemEdge,
      resolve: ({ userId, itemId }) => {
        let item = database.getItem(itemId);
        return {
          node: item,

          // TODO(burdon): Do we need to retrieve all items here?
          cursor: cursorForObjectInConnection(
            database.getItems(userId),
            item
          )
        }
      }
    },
  },

  mutateAndGetPayload: ({ userId, title, labels, status }) => {
    let localUserId = fromGlobalId(userId).id;

    let item = database.createItem(localUserId, {
      title: title,
      labels: labels,
      status: status
    });

    return {
      userId: localUserId,
      itemId: item.id
    };
  }
});

/**
 * Set Mutation
 * E.g., [{ value: 'favorite' }, { index: -1, value: 'inbox' }]
 */
// TODO(burdon): Move up.
// https://github.com/graphql/graphql-js/blob/master/src/type/definition.js#L55-L60
const StringListMutation = new GraphQLList(new GraphQLInputObjectType({
  name: 'StringListMutation',
  fields: () => ({
    index: { type: GraphQLInt, defaultValue: 0 },           // -1 = remove
    value: { type: new GraphQLNonNull(GraphQLString) }
  })
}));

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
    },

    // TODO(burdon): Remove.
    status: {
      type: GraphQLInt
    }
  },

  outputFields: {
    item: {
      type: itemType,
      resolve: ({ userId, itemId }) => {
        return database.getItem(itemId)
      }
    }
  },

  mutateAndGetPayload: ({ userId, itemId, title, labels, status }) => {
    let localUserId = fromGlobalId(userId).id;
    let localItemId = fromGlobalId(itemId).id;

    let item = database.updateItem(localItemId, {
      title: title,
      labels: labels,
      status: status
    });

    return {
      userId: localUserId,
      itemId: item.id
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
// Main app schema.
// http://graphql.org/graphql-js/type/#schema
//

const schema = new GraphQLSchema({
  types: [itemType, noteType], // Needed for resolving interface generics.
  query: rootQueryType,
  mutation: rootMutationType
});

export default schema;
