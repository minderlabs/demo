#!/usr/bin/env babel-node --optional es7.asyncFunctions

// Transpiles GraphQL schema for Relay.
// https://github.com/relayjs/relay-starter-kit/blob/master/scripts/updateSchema.js
// https://facebook.github.io/relay/docs/guides-babel-plugin.html#schema-json

'use strict';

import fs from 'fs';
import path from 'path';

import { graphql }  from 'graphql';
import { introspectionQuery, printSchema } from 'graphql/utilities';

import schema from '../../javascript/common/data/schema';

var DATA_DIR = '../../javascript/common/data';

// Saves JSON of full schema introspection for Babel Relay Plugin to use.
(async () => {
  var result = await (graphql(schema, introspectionQuery));
  if (result.errors) {
    console.error('Schema Error', JSON.stringify(result.errors, null, 2));
  } else {
    // TODO(burdon): Output generated files elsewhere?
    fs.writeFileSync(
      path.join(__dirname, DATA_DIR, 'schema.json'), JSON.stringify(result, null, 2)
    );
  }
})();

// Saves user readable type system shorthand of schema.
fs.writeFileSync(
  path.join(__dirname, DATA_DIR, 'schema.graphql'),
  printSchema(schema)
);