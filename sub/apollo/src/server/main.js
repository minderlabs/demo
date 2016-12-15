//
// Copyright 2016 Minder Labs.
//

import './config';

import _ from 'lodash';

import path from 'path';
import http from 'http';
import express from 'express';
import handlebars from 'express-handlebars';
import cookieParser from 'cookie-parser';
import favicon from 'serve-favicon';

import { Logger, Matcher } from 'minder-core';
import { Database, Firebase, MemoryItemStore, Randomizer, graphqlRouter } from 'minder-graphql';

import { FirebaseConfig } from '../common/defs';

import { adminRouter } from './admin';
import { appRouter, hotRouter } from './app';
import { loginRouter, AuthManager } from './auth';
import { clientRouter, ClientManager, SocketManager } from './client';
import { loggingRouter } from './logger';

const logger = Logger.get('main');


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

const testing = (env !== 'production');


//
// Express.
//

// TODO(burdon): Use injector pattern (esp for async startup).
let promises = [];

const app = express();

const server = http.Server(app);

const matcher = new Matcher();

// TODO(burdon): Factor out const.
// https://firebase.google.com/docs/database/admin/start
const firebase = new Firebase(matcher, {
  databaseURL: FirebaseConfig.databaseURL,

  // Download JSON config.
  // https://console.firebase.google.com/project/minder-beta/settings/serviceaccounts/adminsdk
  // NOTE: Path must work for dev and prod (docker).
  credentialPath: path.join(__dirname, 'conf/minder-beta-firebase-adminsdk-n6arv.json')
});

const authManager = new AuthManager(firebase.admin);

const socketManager = new SocketManager(server);

const clientManager = new ClientManager(socketManager);

const database = new Database(matcher)

  .registerItemStore('User', firebase.userStore)

  .registerItemStore(Database.DEFAULT, testing ? new MemoryItemStore(matcher) : firebase.itemStore)

  .onMutation(() => {
    // Notify clients of changes.
    clientManager.invalidateOthers();
  });


//
// Database.
//

let context = {};

// Load test data.
_.each(require('./testing/test.json'), (items, type) => {

  // Iterate items per type.
  database.upsertItems(context, _.map(items, (item) => {

    // TODO(burdon): Reformat folders.
    if (type == 'Folder') {
      item.filter = JSON.stringify(item.filter);
    }

    return { type, ...item };
  }));
});

// Create test data.
promises.push(database.queryItems({}, {}, { type: 'User' })
  .then(users => {

    // Create group.
    return database.getItem(context, 'Group', 'minderlabs')

      .then(item => {
        item.members = _.map(users, user => user.id);
        database.upsertItem(context, item);
      });
  })

  .then(() => {
    if (testing) {
      let randomizer = new Randomizer(database, context);

      return Promise.all([
        randomizer.generate('Contact', 20),
        randomizer.generate('Place', 10),
        randomizer.generate('Task', 30, {
          owner: {
            type: 'User', likelihood: 1.0
          },
          assignee: {
            type: 'User', likelihood: 0.5
          }
        })
      ]);
    }
  }));


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

if (env === 'production') {
  app.use('/', loggingRouter({}));
}


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

app.use(loginRouter(firebase.userStore, {
  env
}));

app.use(graphqlRouter(database, {
  logging: true,
  pretty: false,

  // TODO(burdon): Check authenticated.
  // Gets the user context from the request headers (async).
  // NOTE: The client must pass the same context shape to the matcher.
  context: request => authManager.getUserInfoFromHeader(request)
    .then(userInfo => ({
      user: {
        id: userInfo.id
      }
    }))
}));

app.use(adminRouter(clientManager, firebase));

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
  logger.log(`[404]: ${req.path}`);

  // TODO(burdon): Don't redirect if resource request (e.g., robots.txt, favicon.ico, etc.)
//res.redirect('/home');
  res.status = 404;
});


//
// Start-up.
//

Promise.all(promises).then(() => {
  logger.log('STARTING...');

  server.listen(port, host, () => {
    let addr = server.address();
    logger.log(`RUNNING[${env}] http://${addr.address}:${addr.port}`);
  });
});
