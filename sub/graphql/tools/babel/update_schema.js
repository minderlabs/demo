#!/usr/bin/env babel-node --optional es7.asyncFunctions

// Transpiles GraphQL schema.

'use strict';

import fs from 'fs';
import path from 'path';

import { graphql }  from 'graphql';
import { introspectionQuery } from 'graphql/utilities';
import { makeExecutableSchema } from 'graphql-tools';

import Schema from '../../src/schema.graphql';

const dist = path.join(__dirname, '../../dist');
const filename = path.join(dist, 'schema.json');

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist);
}

//
// Creates JSON schema definition for Pycharm GraphQL plugin.
// TODO(burdon): Factor out with schema.js
//

(async () => {

  const schema = makeExecutableSchema({
    typeDefs: Schema
  });

  let result = await (graphql(schema, introspectionQuery));
  if (result.errors) {
    console.error('Schema Error', JSON.stringify(result.errors, null, 2));
  } else {
    fs.writeFileSync(filename, JSON.stringify(result, null, 2));
    console.log('Created: %s', filename);
  }
})();
