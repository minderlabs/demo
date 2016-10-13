//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

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


// TODO(burdon): Async promise?
const database = new Database().init();

/**
 * Relay Node interface. Maps objects to types, and global IDs to objects.
 * https://facebook.github.io/relay/docs/tutorial.html
 */
const { nodeInterface, nodeField } = nodeDefinitions(
  (globalId) => {
    // TODO(burdon): Type defs?
    const { type, id } = fromGlobalId(globalId);
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

// TODO(madadam): Implement users and add fake data associating items with users.
//                Currently there's one user with all items.

const userType = new GraphQLObjectType({
  name: 'User',
  description: 'A user account.',
  interfaces: [ nodeInterface ],
  fields: () => ({
    id: globalIdField('User'),

    // TODO(burdon): Standardize on "title" field?
    title: {
      type: GraphQLString,
      description: 'User\'s name.',
      resolve: (item) => item.title
    },

    items: {
      type: ItemConnection,
      description: 'User\'s collection of items.',
      args: connectionArgs,
      resolve: (_, args) => connectionFromArray(database.query('Item'), args)
    }
  })
});

const itemType = new GraphQLObjectType({
  name: 'Item',
  description: 'A generic data item.',
  interfaces: [ nodeInterface ],
  fields: () => ({
    id: globalIdField('Item'),

    version: {
      type: GraphQLInt,
      description: 'Item version.',
      resolve: (item) => item.version
    },

    title: {
      type: GraphQLString,
      description: 'Item title.',
      resolve: (item) => item.title
    },

    status: {
      type: GraphQLInt,
      description: 'Item status.',
      resolve: (item) => item.status
    }
  })
});

// TODO(burdon): Document.
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

const queryRootType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    node: nodeField,
    user: {
      type: userType,
      resolve: () => database.getUser()
    },
    items: {
      type: itemType,
      resolve: () => database.query('Item')
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
    }
  },

  outputFields: {
    user: {
      type: userType,

      // TODO(burdon): Items don't just come from Users.
      // TODO(madadam): Add userId to the mutation, and associate the new Item with the user?
      // Otherwise this should return all items.
      resolve: () => database.getUser()
    },

    createItemEdge: {
      type: ItemEdge,
      resolve: ({ itemId }) => {
        let item = database.getItem(itemId);
        return {
          // TODO(burdon): Use userId.
          cursor: cursorForObjectInConnection(
            database.getItems(),
            item
          ),
          node: item
        }
      }
    },
  },

  mutateAndGetPayload: ({ userId, title }) => {
    const { type, id } = fromGlobalId(userId);

    let item = database.createItem(id, {
      title: title
    });

    return {
      itemId: item.id
    };
  }
});

const UpdateItemMutation = mutationWithClientMutationId({
  name: 'UpdateItemMutation',

  inputFields: {
    itemId: {
      type: new GraphQLNonNull(GraphQLID)
    },

    // TODO(burdon): Generalize? Pass in entire item? (Same issue for create above.)
    //               Or JSON object where each non-undefined field is to be set?
    status: {
      type: new GraphQLNonNull(GraphQLInt)
    }
  },

  outputFields: {
    item: {
      type: itemType,
      resolve: ({ itemId }) => database.getItem(itemId)
    }
  },

  mutateAndGetPayload: ({ itemId, status }) => {
    const { type, id } = fromGlobalId(itemId);

    let item = database.updateItem({
      id: id,
      status: status
    });

    // TODO(burdon): What do these fields correspond to?
    return {
      itemId: item.id
    };
  }
});

//
// Root mutation type.
//

const mutationRootType = new GraphQLObjectType({
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

export const Schema = new GraphQLSchema({
  query: queryRootType,
  mutation: mutationRootType
});
