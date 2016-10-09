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

let {nodeInterface, nodeField} = nodeDefinitions(
  (globalId) => {
    var {type, id} = fromGlobalId(globalId);
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

var itemType = new GraphQLObjectType({
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
 * This is the type that will be the root of our query,
 * and the entry point into our schema.
 */
let queryType = new GraphQLObjectType({
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

export var Schema = new GraphQLSchema({
  query: queryType
});
