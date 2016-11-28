//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import path from 'path';
import http from 'http';
import express from 'express';
import handlebars from 'express-handlebars';

import { MemoryDatabase, Randomizer, graphqlRouter } from 'minder-graphql';

import { appRouter, hotRouter } from './app';
import { loginRouter, requestContext } from './auth';
import { loggingRouter } from './logger';
import { adminRouter, clientRouter, ClientManager, SocketManager } from './client';

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

// TODO(burdon): Use injector pattern (esp for async startup).

const socketManager = new SocketManager(server);

const clientManager = new ClientManager(socketManager);

const database = new MemoryDatabase().onMutation(() => {
  clientManager.invalidateOthers();
});


//
// Logging.
//

app.use('/', loggingRouter());


//
// Database.
//

let context = {};

_.each(require('./testing/test.json'), (items, type) => {
  database.upsertItems(context, _.map(items, (item) => ({ type, ...item })));
});

// TODO(burdon): Webhook.
const testData = true;

if (testData) {
  new Randomizer(database, context)
    .generate('Contact', 20)
    .generate('Place', 10)
    .generate('Task', 30,
      {
        owner: { type: 'User', likelihood: 1.0 },
        assignee: { type: 'User', likelihood: 0.5 }
      }
    );
}


//
// Hot loader.
// NOTE: Must come first.
//

if (env === 'hot') {
  app.use(hotRouter());
}


//
// Routers.
//

app.use(loginRouter({
  env,
  users: database.queryItems({}, { type: 'User' })
}));

app.use(graphqlRouter(database, {
  logging: true,

  // Gets the user context from the request.
  resolverContext: (req) => { return requestContext(req) },
}));

app.use(adminRouter(clientManager));

app.use(clientRouter(clientManager, server));

app.use(appRouter(clientManager, {
  env
}));


//
// Handlebars views.
// https://github.com/ericf/express-handlebars
//

app.engine('handlebars', handlebars({

  layoutsDir: path.join(__dirname, 'views/layouts'),

  defaultLayout: 'main',

  helpers: {

    // TODO(burdon): ???
    section: function(name, options) {
      if (!this.sections) { this.sections = {}; }
      this.sections[name] = options.fn(this);
    },

    toJSON: function(object) {
      return JSON.stringify(object);
    },

    time: function(object) {
      return object && object.fromNow();
    }
  }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(function(req, res) {
  res.redirect('/login');
});

//
// Start-up.
//

server.listen(port, host, () => {
  let addr = server.address();
  console.log(`### RUNNING[${env}] http://${addr.address}:${addr.port} ###`);
});

