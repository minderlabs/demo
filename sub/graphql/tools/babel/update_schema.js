#!/usr/bin/env babel-node --optional es7.asyncFunctions

//
// Transpiles GraphQL schema.
//

import fs from 'fs';
import path from 'path';

import { graphql }  from 'graphql';
import { introspectionQuery } from 'graphql/utilities';
import { concatenateTypeDefs, makeExecutableSchema } from 'graphql-tools';

import Framework from '../../src/gql/framework.graphql';
import Schema from '../../src/gql/schema.graphql';

const dist = path.join(__dirname, '../../dist');
const filename = path.join(dist, 'schema.json');

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist);
}

//
// Creates JSON schema definition for Pycharm GraphQL plugin.
//

(async () => {
  console.log('Creating schema...');
  try {
    const schema = makeExecutableSchema({
      typeDefs: concatenateTypeDefs([Framework, Schema])
    });

    let result = await (graphql(schema, introspectionQuery));
    if (result.errors) {
      console.error('Schema Error', JSON.stringify(result.errors, null, 2));
    } else {
      fs.writeFileSync(filename, JSON.stringify(result, null, 2));
      console.log('Created: %s', filename);
    }
  } catch(error) {
    console.log('Error Creating Schema:', error);
  }
})();
