//
// Copyright 2017 Minder Labs.
//

import express from 'express';
import http from 'http';

import {
  Database,
  TypeUtil
} from 'minder-core';

import {
  graphqlRouter
} from 'minder-graphql';

const app = express();

const server = http.Server(app);

const database = new Database();

app.use(graphqlRouter(database, {}));

server.listen(3000, '127.0.0.1', () => {
  console.log(TypeUtil.stringify({ status: 'ok' }));
});
