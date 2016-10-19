//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

//
// Server-side code that generates the JSON schema used by the client.
// https://github.com/facebook/graphql
//

// TODO(burdon): Keep in sync with schema.py

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
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
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
  Database
} from './database';


//
// Main database instance.
// TODO(burdon): Use Data loader to do efficient entity look-ups on server (e.g., for RethinkDB/ORM layer).
// http://graphql.org/blog/rest-api-graphql-wrapper/#creating-a-data-loader
//

const database = new Database().init();

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

  //
  // Determines node type of object instance.
  //

  (obj) => {
    // TODO(burdon): Infer from something other than type?
    if (obj instanceof User) {
      return userType;
    } else if (obj instanceof Item)  {
      return itemType;
    } else {
      return null;
    }
  }
);

//
// Note type definitions.
// https://facebook.github.io/relay/docs/graphql-object-identification.html
//

const userType = new GraphQLObjectType({
  name: 'User',
  interfaces: [ nodeInterface ],

  fields: () => ({
    id: globalIdField('User'),

    // TODO(burdon): Standardize on "title" field in type definition?
    title: {
      type: GraphQLString,
      resolve: (item) => item.title
    },

    searchItems: {
      type:
    },

    // TODO(burdon): Magic name ItemConnection?
    // TODO(burdon): Parameterize (e.g., search?)
    // TODO(burdon): Document connections.
    // https://github.com/graphql/graphql-relay-js#connections
    items: {
      type: ItemConnection,
      args: connectionArgs,
      resolve: (user, args) => connectionFromArray(database.getItems(user.id, args), args)
    }
  })
});

// TODO(burdon): Union of inner types or interface?
// http://graphql.org/graphql-js/type/#graphqluniontype
// http://graphql.org/graphql-js/type/#graphqlinterfacetype

const itemType = new GraphQLObjectType({
  name: 'Item',
  interfaces: [ nodeInterface ],

  fields: () => ({
    id: globalIdField('Item'),

    version: {
      type: GraphQLInt,
      resolve: (item) => item.version
    },

    title: {
      type: GraphQLString,
      resolve: (item) => item.title
    },

    status: {
      type: GraphQLInt,
      resolve: (item) => item.status
    }
  })
});

//
// TODO(burdon): Document. Where are these consts used?
// https://github.com/graphql/graphql-relay-js#connections
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
        userId: { type: GraphQLID },
        query: { type: GraphQLString }    // TODO(burdon): ???
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

    // TODO(burdon): Change to array of labels.
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

  mutateAndGetPayload: ({ userId, title, status }) => {
    let localUserId = fromGlobalId(userId).id;

    let item = database.createItem(localUserId, {
      title: title,
      status: status
    });

    return {
      userId: localUserId,
      itemId: item.id
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
      type: itemType,
      resolve: ({ userId, itemId }) => {
        return database.getItem(itemId)
      }
    }
  },

  mutateAndGetPayload: ({ userId, itemId, title, status }) => {
    let localUserId = fromGlobalId(userId).id;
    let localItemId = fromGlobalId(itemId).id;

    let item = database.updateItem(localItemId, {
      title: title,
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
  query: rootQueryType,
  mutation: rootMutationType
});

export default schema;
