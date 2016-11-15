#!/usr/bin/env babel-node --optional es7.asyncFunctions

// Transpiles GraphQL schema.

'use strict';

import fs from 'fs';
import path from 'path';

import { graphql }  from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { introspectionQuery } from 'graphql/utilities';

import TypeDefs from '../../js/data/schema.graphql';

const DIST_DIR = path.join(__dirname, '../../dist');

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR);
}

//
// Creates JSON schema definition for Pycharm GraphQL plugin.
//

(async () => {
  const schema = makeExecutableSchema({
    typeDefs: TypeDefs
  });

  let result = await (graphql(schema, introspectionQuery));
  if (result.errors) {
    console.error('Schema Error', JSON.stringify(result.errors, null, 2));
  } else {
    fs.writeFileSync(
      path.join(DIST_DIR, 'schema.json'), JSON.stringify(result, null, 2)
    );
  }
})();
