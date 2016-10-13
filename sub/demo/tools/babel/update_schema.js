#!/usr/bin/env babel-node --optional es7.asyncFunctions

// Transpiles GraphQL schema for Relay.
// https://github.com/relayjs/relay-starter-kit/blob/master/scripts/updateSchema.js

import fs from 'fs';
import path from 'path';
import { graphql }  from 'graphql';
import { introspectionQuery, printSchema } from 'graphql/utilities';

import { Schema } from '../../common/data/schema';

// Save JSON of full schema introspection for Babel Relay Plugin to use.
(async () => {
  var result = await (graphql(Schema, introspectionQuery));
  if (result.errors) {
    console.error(
      'ERROR introspecting schema: ',
      JSON.stringify(result.errors, null, 2)
    );
  } else {
    // TODO(burdon): Output generated files elsewhere?
    fs.writeFileSync(
      path.join(__dirname, '../../common/data/schema.json'),
      JSON.stringify(result, null, 2)
    );
  }
})();

// Save user readable type system shorthand of schema.
fs.writeFileSync(
  path.join(__dirname, '../../common/data/schema.graphql'),
  printSchema(Schema)
);
