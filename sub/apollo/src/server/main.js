//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import path from 'path';
import http from 'http';
import express from 'express';
import handlebars from 'express-handlebars';

import { loggingRouter } from 'minder-core';
import { Database, Randomizer, graphqlRouter } from 'minder-graphql';

import { appRouter, hotRouter } from './app';


//
// Env.
//

const env = process.env['NODE_ENV'] || 'development';
const host = (env === 'production') ? '0.0.0.0' : '127.0.0.1';
const port = process.env['VIRTUAL_PORT'] || 3000;


//
// Express.
//

const app = express();


//
// Logging.
//

app.use('/', loggingRouter());


//
// GraphQL server.
//

const database = new Database();

const data = require('./testing/test.json');
_.each(data, (items, type) => {
  database.upsertItems(_.map(items, (item) => ({ type, ...item })));
});

// TODO(burdon): Trigger from webhook.
const randomizer = null && new Randomizer(database)
  .generate('Contact',  20)
  .generate('Place',    10)
  .generate('Task',     20,
    {
      owner:    { type: 'User', likelihood: 1.0 },
      assignee: { type: 'User', likelihood: 0.5 }
    }
  );

app.use('/', graphqlRouter(database, { debug: true }));


//
// Hot loader.
//

if (env === 'hot') {
  app.use(hotRouter());
}


//
// App
//

app.use(appRouter());


//
// Handlebars views.
// https://github.com/ericf/express-handlebars
//

app.engine('handlebars', handlebars({
  helpers: {
    toJSON : function(object) {
      return JSON.stringify(object);
    }
  }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));


//
// Start-up.
//

const server = http.Server(app);

server.listen(port, host, () => {
  let addr = server.address();
  console.log(`### RUNNING[${env}] http://${addr.address}:${addr.port} ###`);
});

