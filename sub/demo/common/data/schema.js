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

let userType = new GraphQLObjectType({
  name: 'User',
  description: 'A user',
  fields: () => ({
    id: globalIdField('User'),
    items: {
      type: itemConnection,
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

let {connectionType: itemConnection} = connectionDefinitions({name: 'Item', nodeType: itemType});

/**
 * Root query type.
 */
const queryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    node: nodeField,
    user: {
      type: userType,
      resolve: () => Database.getUser('1')
    },
    items: {
      type: itemType,
      resolve: () => Database.getItems()
    }
  })
});

// TODO(madadam): Upsert. This just creates a new item.

const ItemMutation = mutationWithClientMutationId( {
  name: 'ItemMutation',
  inputFields: {
    title: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  outputFields: {
    item: {
      type: itemType,
      resolve: (payload) => Database.getItem(payload.itemId)
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
