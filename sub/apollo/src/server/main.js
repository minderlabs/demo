//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';

import path from 'path';
import http from 'http';
import express from 'express';
import handlebars from 'express-handlebars';
import cookieParser from 'cookie-parser';
import favicon from 'serve-favicon';

import { Matcher } from 'minder-core';
import { Database, MemoryItemStore, Randomizer, graphqlRouter } from 'minder-graphql';

import { appRouter, hotRouter } from './app';
import { loginRouter, AuthManager } from './auth';
import { loggingRouter } from './logger';
import { adminRouter, clientRouter, ClientManager, SocketManager } from './client';
import { FirebaseStore } from './db/firebase';


//
// Error handling.
//

function handleError(err) {
  console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
  console.error(err.stack);
//process.exit(1)
}

process.on('uncaughtException', handleError);
process.on('unhandledRejection', handleError);


//
// Env.
//

const env = process.env['NODE_ENV'] || 'development';
const host = (env === 'production') ? '0.0.0.0' : '127.0.0.1';
const port = process.env['VIRTUAL_PORT'] || 3000;


//
// Express.
// TODO(burdon): Use injector pattern (esp for async startup).
//

const app = express();

const server = http.Server(app);

const matcher = new Matcher();

// TODO(burdon): Factor out const.
// https://firebase.google.com/docs/database/admin/start
const firebaseStore = new FirebaseStore(matcher, {
  databaseURL: 'https://minder-beta.firebaseio.com',

  // Download JSON config.
  // https://console.firebase.google.com/project/minder-beta/settings/serviceaccounts/adminsdk
  // NOTE: Path must work for dev and prod (docker).
  credentialPath: path.join(__dirname, 'conf/minder-beta-firebase-adminsdk-n6arv.json')
});

const authManager = new AuthManager();

const socketManager = new SocketManager(server);

const clientManager = new ClientManager(socketManager);

const database = new Database(matcher)

  .registerItemStore('User', firebaseStore.userStore)
  .registerItemStore(Database.DEFAULT, new MemoryItemStore(matcher))

  .onMutation(() => {
    // Notify clients of changes.
    clientManager.invalidateOthers();
  });


//
// Database.
// TODO(burdon): Note all of this is asynchronous. Needs chaining/injector.
//

let context = {};

// Load test data.
_.each(require('./testing/test.json'), (items, type) => {
  database.upsertItems(context, _.map(items, (item) => ({ type, ...item })));
});

// Create team.
database.queryItems({}, { type: 'User' }).then(users => {
  console.log('USERS', JSON.stringify(users));

  database.getItem(context, 'Group', 'minderlabs').then(item => {
    item.members = _.map(users, user => user.id);
    database.upsertItem(context, item);
  });
});

// TODO(burdon): Webhook?
const testData = true;
if (testData) {
  new Randomizer(database, context)
    .generate('Contact', 20)
    .generate('Place', 10)
    .generate('Task', 15, {
      owner: {
        type: 'User', likelihood: 1.0
      },
      assignee: {
        type: 'User', likelihood: 0.5
      }
    });
}


//
// Hot loader.
// NOTE: Must come first.
//

if (env === 'hot') {
  app.use(hotRouter());
}


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


//
// Logging.
//

app.use('/', loggingRouter({}));


//
// Public assets.
// https://expressjs.com/en/starter/static-files.html
//

app.use(favicon(path.join(__dirname, 'public/favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));


//
// Routers.
//

app.use(cookieParser());

app.get('/home', async function(req, res) {
  let userInfo = await authManager.getUserInfoFromCookie(req);
  if (!userInfo) {
    res.render('home');
  } else {
    res.redirect('/app');
  }
});

app.use(loginRouter(firebaseStore.userStore, {
  env
}));

app.use(graphqlRouter(database, {
  logging: true,
  pretty: false,

  // Gets the user context from the request headers (async).
  context: request => authManager.getUserInfoFromHeader(request).then(user => ({ user }))
}));

app.use(adminRouter(clientManager));

app.use(clientRouter(authManager, clientManager, server));

app.use(appRouter(authManager, clientManager, {
  env,

  // TODO(burdon): Clean this up with config.
  assets: env === 'production' ? __dirname : path.join(__dirname, '../../dist')
}));

app.use('/', function(req, res) {
  res.redirect('/home');
});

// Default redirect.
app.use(function(req, res) {
  console.log('[404]: %s', req.path);

  // TODO(burdon): Don't redirect if resource request (e.g., robots.txt, favicon.ico, etc.)
//res.redirect('/home');
  res.status = 404;
});


//
// Start-up.
//

server.listen(port, host, () => {
  let addr = server.address();
  console.log(`### RUNNING[${env}] http://${addr.address}:${addr.port} ###`);
});
