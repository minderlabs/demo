//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

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
const {nodeInterface, nodeField} = nodeDefinitions(
  (globalId) => {
    // TODO(burdon): Type defs?
    const {type, id} = fromGlobalId(globalId);
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
// Type definitions.
//

// TODO(madadam): Implement users and add fake data associating items with users.
//                Currently there's one user with all items.

const userType = new GraphQLObjectType({
  name: 'User',
  description: 'A user account.',
  fields: () => ({
    // https://facebook.github.io/relay/docs/graphql-object-identification.html
    id: globalIdField('User'),
    items: {
      type: itemConnection,
      description: 'User\'s collection of items.',
      args: connectionArgs,
      resolve: (_, args) => connectionFromArray(database.query('Item'), args)
    }
  }),
  interfaces: [nodeInterface]
});

const itemType = new GraphQLObjectType({
  name: 'Item',
  description: 'A generic data item.',
  fields: () => ({
    id: globalIdField('Item'),
    version: {
      type: GraphQLInt,
      description: 'Item version.',
      resolve: (item) => item.version
    },
    status: {
      type: GraphQLBoolean,
      description: 'Item status.',
      resolve: (item) => item.status
    },
    title: {
      type: GraphQLString,
      description: 'Item title.',
      resolve: (item) => item.title
    }
  }),
  interfaces: [nodeInterface]
});

// TODO(burdon): Document.
const {connectionType: itemConnection} = connectionDefinitions({
  name: 'Item',
  nodeType: itemType
});

//
// Query root.
//

const queryType = new GraphQLObjectType({
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
// Mutation root.
// TODO(madadam): Upsert. This just creates a new item.
//

const ItemMutation = mutationWithClientMutationId({
  name: 'ItemMutation',
  inputFields: {
    title: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  outputFields: {
    item: {
      type: itemType,
      resolve: (payload) => database.getItem(payload.itemId)
    }
  },
  mutateAndGetPayload: ({title}) => {
    const item = database.newItem({
      title: title
    });
    return {
      itemId: item.id
    }
  }
});

const mutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    itemMutation: ItemMutation
  })
});

//
// Main app schema.
// http://graphql.org/graphql-js/type/#schema
//

export const Schema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType
});
