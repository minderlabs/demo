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
  cursorForObjectInConnection,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
} from 'graphql-relay';

import {
  // Import methods that your schema can use to interact with your database
  User,
  Item,
  Database
} from './database';

/**
 * Relay Node interface. Maps objects to types, and global IDs to objects.
 * https://facebook.github.io/relay/docs/tutorial.html
 */
let {nodeInterface, nodeField} = nodeDefinitions(
  (globalId) => {
    const {type, id} = fromGlobalId(globalId);
    console.log('UNPACKED global ID ' + type + ' ' + id); // FIXME
    if (type === 'User') {
      return Database.getUser(id);
    } else if (type === 'Item') {
      let i = Database.getItem(id);
      console.log('FETCHED ' + JSON.stringify(i));
      return i;
    } else {
      return null;
    }
  },
  (obj) => {
    if (obj instanceof User) {
      return userType;
    } else if (obj instanceof Item)  {
      return itemType;
    } else {
      return null;
    }
  }
);

// TODO(madadam): Implement users and add fake data associating items with users. currently there's one
// user with all items.

let userType = new GraphQLObjectType({
  name: 'User',
  description: 'A user',
  fields: () => ({
    id: globalIdField('User'),
    items: {
      type: ItemConnection,
      description: 'A person\'s collection of items',
      args: connectionArgs,
      resolve: (_, args) => connectionFromArray(Database.getItems(), args)
    }
  }),
  interfaces: [nodeInterface]
});

const itemType = new GraphQLObjectType({
  name: 'Item',
  description: 'An item',
  fields: () => ({
    id: globalIdField('Item'),
    version: {
      type: GraphQLInt,
      description: 'The item version id',
      resolve: (item) => item.version
    },
    title: {
      type: GraphQLString,
      description: 'The title of the item',
      resolve: (item) => item.title
    }
  }),
  interfaces: [nodeInterface]
});

const {
  connectionType: ItemConnection,
  edgeType: ItemEdge
} = connectionDefinitions({name: 'Item', nodeType: itemType});

/**
 * Root query type.
 */
const queryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    node: nodeField,
    user: {
      type: userType,
      // TODO(madadam): viewer = current user.
      resolve: () => Database.getUser('1')
    },
    items: {
      type: itemType,
      resolve: () => Database.getItems()
    }
  })
});

// TODO(madadam): Upsert. This just creates a new item.

const ItemMutation = mutationWithClientMutationId({
  name: 'ItemMutation',
  inputFields: {
    title: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  outputFields: {
    newItemEdge: {
      type: ItemEdge,
      resolve: (payload) => {
        const item = Database.getItem(payload.itemId);
        return {
          cursor: cursorForObjectInConnection(
            Database.getItems(),
            item
          ),
          node: item
        }
      }
    },
    user: {
      type: userType,
      // TODO(madadam): Add userId to the mutation, and associate the new Item with the user?
      // Otherwise this should return all items.
      resolve: (payload) => Database.getUser('1')
    }
  },
  mutateAndGetPayload: ({title}) => {
    const item = Database.newItem({
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

export const Schema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType
});
