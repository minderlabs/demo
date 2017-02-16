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
import memjs from 'memjs';

import { IdGenerator, Matcher, MemcacheItemStore, MemoryItemStore, Logger } from 'minder-core';
import {
  Database,
  Firebase,
  GoogleDriveQueryProcessor,
  SlackQueryProcessor,
  graphqlRouter
} from 'minder-graphql';

import { Const, FirebaseConfig, GoogleApiConfig, SlackConfig } from '../common/defs';

import { adminRouter } from './admin';
import { appRouter, hotRouter } from './app';
import { accountsRouter, AccountManager, SlackAccountHandler } from './accounts';
import { loginRouter, AuthManager } from './auth';
import { botkitRouter, BotKitManager } from './botkit/app/manager';
import { clientRouter, ClientManager, SocketManager } from './client';
import { Loader } from './data/loader';
import { TestData } from './data/testing';
import { testingRouter } from './testing';
import { loggingRouter } from './logger';

const logger = Logger.get('main');


//
// Error handling.
//

function handleError(error) {
  console.error('### ERROR: %s', error && error.message || error);
  error && error.stack && console.error(error.stack);
}

// https://nodejs.org/api/process.html#process_event_uncaughtexception
process.on('uncaughtException', handleError);

// https://nodejs.org/api/process.html#process_event_unhandledrejection
process.on('unhandledRejection', handleError);


//
// Env.
//

const Config = {

  MEMCACHE_HOST: _.get(process.env, 'MEMCACHE_SERVICE_HOST', '127.0.0.1'),
  MEMCACHE_PORT: _.get(process.env, 'MEMCACHE_SERVICE_PORT', '11211')
};

// TODO(burdon): Move to Config.
const env = _.get(process.env, 'NODE_ENV', 'development');
const host = (env === 'production') ? '0.0.0.0' : '127.0.0.1';
const port = _.get(process.env, 'PORT', 3000);

const testing = (env !== 'production');


//
// Express.
//

const app = express();

const server = http.Server(app);

const socketManager = new SocketManager(server);

const clientManager = new ClientManager(socketManager);

const idGenerator = new IdGenerator(1000);

const matcher = new Matcher();


//
// Firebase
// https://firebase.google.com/docs/database/admin/start
//

const firebase = new Firebase(idGenerator, matcher, {

  databaseURL: FirebaseConfig.databaseURL,

  // Download JSON config.
  // https://console.firebase.google.com/project/minder-beta/settings/serviceaccounts/adminsdk
  // NOTE: Path must work for dev and prod (docker).
  // TODO(burdon): Factor out const.
  credentialPath: path.join(__dirname, 'conf/minder-beta-firebase-adminsdk-n6arv.json')
});

const authManager = new AuthManager(firebase.admin, firebase.systemStore);


//
// Memcache
// https://github.com/alevy/memjs
//

// const memcache = memjs.Client.create(`${Config.MEMCACHE_HOST}:${Config.MEMCACHE_PORT}`, {
//   failoverTime: 60
// });


//
// Database.
//

const defaultItemStore = testing ?
  new MemoryItemStore(idGenerator, matcher, Database.DEFAULT_NAMESPACE) : firebase.itemStore;

const database = new Database(idGenerator, matcher)

  .registerItemStore(firebase.systemStore)
  .registerItemStore(defaultItemStore)

  .registerQueryProcessor(defaultItemStore)

  .onMutation(() => {
    // Notify clients of changes.
    // TODO(burdon): Create notifier abstraction.
    clientManager.invalidateOthers();
  });


//
// External query processors.
//

database
  .registerQueryProcessor(new GoogleDriveQueryProcessor(idGenerator, matcher, GoogleApiConfig));


//
// Slack.
// NOTE: Disabled for testing since slow startup.
//

const botkitManager = testing ? null : new BotKitManager({
  port,
  redirectHost: _.get(process.env, 'OAUTH_REDIRECT_ROOT', 'http://localhost:' + port),
  ...SlackConfig
});

if (botkitManager) {
  database
    .registerQueryProcessor(new SlackQueryProcessor(idGenerator, matcher, botkitManager));
}


//
// Data initialization.
//

let loader = new Loader(database);

let loading = Promise.all([
  // Do in parallel.
  loader.parse(require('./data/accounts.json'), Database.SYSTEM_NAMESPACE),
  loader.parse(require('./data/startup.json')),
  loader.parse(require('./data/demo.json'))
]).then(() => {
  // Then init once parsing (and database update) is done.
  return loader.initGroup(Const.DEF_GROUP);
});


//
// Test data.
//

if (testing) {
  loading.then(() => {

    let itemStoreRandomizer = TestData.randomizer(database, database.getItemStore());
    return Promise.all([
      itemStoreRandomizer.generate('Task', 30, TestData.TaskFields(itemStoreRandomizer)),
      itemStoreRandomizer.generate('Contact', 5)
    ]).then(() => {

      // Test external data.
      // const testItemStore = new MemcacheItemStore(idGenerator, matcher, memcache, 'testing');
      // database.registerQueryProcessor(testItemStore);
      //
      // testItemStore.clear().then(() => {
      //   let testItemStoreRandomizer = TestData.randomizer(database, testItemStore);
      //   return testItemStoreRandomizer.generate('Contact', 5);
      // });
    });
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

if (env === 'production') {
  app.use('/', loggingRouter({}));
} else {
  app.use('/testing', testingRouter({}));
}


//
// Public assets.
// https://expressjs.com/en/starter/static-files.html
//

app.use(favicon(path.join(__dirname, 'public/favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));


//
// Home page.
//

app.use(cookieParser());

app.get('/home', async function(req, res) {
  let userInfo = await authManager.getUserInfoFromCookie(req);
  if (!userInfo) {
    res.render('home');
  } else {
    res.redirect(Const.ROOT_PATH);
  }
});


//
// GraphQL
//

app.use(graphqlRouter(database, {
  logging: true,
  pretty: false,

  // Use custom UX provided below.
  graphiql: false,

  // Gets the user context from the request headers (async).
  // NOTE: The client must pass the same context shape to the matcher.
  contextProvider: (request) => authManager.getUserInfoFromHeader(request)
    .then(userInfo => {
      // TODO(burdon): 401 handling.
      console.assert(userInfo, 'GraphQL request is not authenticated.');

      return {
        userId: userInfo.id,

        // TODO(burdon): Get from userInfo?
        groupId: Const.DEF_GROUP
      };
    })
}));


//
// Custom GraphiQL.
//

let staticPath = (env === 'production' ?
    path.join(__dirname, '../node_modules') : path.join(__dirname, '../../node_modules'));

app.use('/node_modules', express.static(staticPath));

app.get('/graphiql', function(req, res) {
  return authManager.getUserInfoFromCookie(req)
    .then(userInfo => {
      if (!userInfo) {
        return res.redirect('/home');
      }

      res.render('graphiql', {
        config: {
          headers: [{
            name: 'authentication',
            value: `Bearer ${userInfo.token}`
          }]
        }
      });
  });
});


//
// App.
//

app.use('/user', loginRouter(firebase.systemStore, {
  env
}));

app.use('/admin', adminRouter(clientManager, firebase, {
  scheduler: (env === 'production')
}));

app.use('/client', clientRouter(authManager, clientManager, server));

app.use(appRouter(authManager, clientManager, {

  // App root path.
  root: Const.ROOT_PATH,

  //
  assets: (env === 'production') ? __dirname : path.join(__dirname, '../../dist'),

  // Client config.
  config: {
    env,
    app: {
      name: Const.APP_NAME,
      version: Const.APP_VERSION,
    }
  }
}));

if (botkitManager) {
  app.use('/botkit', botkitRouter(botkitManager));
}

app.use('/accounts', accountsRouter(new AccountManager()
  .registerHandler('Slack', new SlackAccountHandler())));

//
// Catch-all (last).
//

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

loading.then(() => {
  logger.log('Starting minder-app-server');

  server.listen(port, host, () => {
    let addr = server.address();
    logger.log(`[${env}] http://${addr.address}:${addr.port}`);
  });
});
