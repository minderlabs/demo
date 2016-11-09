#!/usr/bin/env babel-node --optional es7.asyncFunctions

// Transpiles GraphQL schema for Relay.
// https://github.com/relayjs/relay-starter-kit/blob/master/scripts/updateSchema.js
// https://facebook.github.io/relay/docs/guides-babel-plugin.html#schema-json

'use strict';

import fs from 'fs';
import path from 'path';

import { graphql }  from 'graphql';
import { introspectionQuery, printSchema } from 'graphql/utilities';

import schema from '../../js/common/data/schema';

const DIST_DIR = path.join(__dirname, '../../dist');

if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR);
}

//
// Saves JSON of full schema introspection for Babel-Relay Plugin to use.
//

(async () => {
  let result = await (graphql(schema, introspectionQuery));
  if (result.errors) {
    console.error('Schema Error', JSON.stringify(result.errors, null, 2));
  } else {
    fs.writeFileSync(
      path.join(DIST_DIR, 'schema.json'), JSON.stringify(result, null, 2)
    );
  }
})();

//
// Saves user readable type system shorthand of schema.
//

fs.writeFileSync(path.join(DIST_DIR, 'schema.graphql'), printSchema(schema));
