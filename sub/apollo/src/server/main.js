//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import path from 'path';
import http from 'http';
import express from 'express';
import handlebars from 'express-handlebars';

import { Database, Randomizer, graphqlRouter } from 'minder-graphql';

import { appRouter, hotRouter } from './app';
import { loginRouter } from './login';
import { loggingRouter } from './logger';
import { clientRouter, SocketManager } from './socket';


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

const server = http.Server(app);


//
// Logging.
//

app.use('/', loggingRouter());


//
// GraphQL server.
//

const database = new Database();

_.each(require('./testing/test.json'), (items, type) => {
  database.upsertItems(_.map(items, (item) => ({ type, ...item })));
});

new Randomizer(database)
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

app.use(loginRouter({
  env: env,
  users: database.queryItems({ type: 'User' })
}));

app.use(clientRouter(new SocketManager(server)));

app.use(appRouter({
  env: env
}));


//
// Handlebars views.
// https://github.com/ericf/express-handlebars
//

app.engine('handlebars', handlebars({

  layoutsDir: path.join(__dirname, 'views/layouts'),

  defaultLayout: 'main',

  helpers: {

    section: function(name, options) {
      if (!this.sections) { this.sections = {}; }
      this.sections[name] = options.fn(this);
    },

    toJSON: function(object) {
      return JSON.stringify(object);
    }
  }
}));

app.set('view engine', 'handlebars');

app.set('views', path.join(__dirname, 'views'));


//
// Start-up.
//

server.listen(port, host, () => {
  let addr = server.address();
  console.log(`### RUNNING[${env}] http://${addr.address}:${addr.port} ###`);
});

