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

import { IdGenerator, Matcher, MemoryItemStore, Logger, TypeUtil } from 'minder-core';
import {
  Database,
  Firebase,
  GoogleDriveQueryProcessor,
  SlackQueryProcessor,
  graphqlRouter
} from 'minder-graphql';

import { Const, FirebaseAppConfig, GoogleApiConfig, SlackConfig } from '../common/defs';

import { adminRouter } from './admin';
import { appRouter, hotRouter } from './app';
import { accountsRouter, AccountManager, SlackAccountHandler } from './accounts';
import { loginRouter, AuthManager } from './auth';
import { botkitRouter, BotKitManager } from './botkit/app/manager';
import { clientRouter, ClientManager } from './client';
import { Loader } from './data/loader';
import { TestData } from './data/testing';
import { testingRouter } from './testing';
import { loggingRouter } from './logger';

const logger = Logger.get('main');


//
// Error handling.
// https://nodejs.org/api/errors.html
// https://www.joyent.com/node-js/production/design/errors (Really good general error handling article).
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

// TODO(burdon): Move to Config.
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

const idGenerator = new IdGenerator(1000);

const clientManager = new ClientManager(idGenerator);

const matcher = new Matcher();


//
// Firebase
// https://firebase.google.com/docs/database/admin/start
//

const firebase = new Firebase(idGenerator, matcher, {

  databaseURL: FirebaseAppConfig.databaseURL,

  // Download JSON config.
  // https://console.firebase.google.com/project/minder-beta/settings/serviceaccounts/adminsdk
  // NOTE: Path must work for dev and prod (docker).
  // TODO(burdon): Factor out const.
  credentialPath: path.join(__dirname, 'conf/minder-beta-firebase-adminsdk-n6arv.json')
});

const authManager = new AuthManager(firebase.admin, firebase.systemStore);


//
// Database.
//

const defaultItemStore = testing ?
  new MemoryItemStore(idGenerator, matcher, Database.NAMESPACE.USER) : firebase.itemStore;

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
  loader.parse(require('./data/accounts.json'), Database.NAMESPACE.SYSTEM),
  loader.parse(require('./data/startup.json')),
  loader.parse(require('./data/demo.json'))
]).then(() => {
  return loader.initGroups();
});


//
// Test data.
//

if (testing) {
  loading.then(groups => {
    // TODO(burdon): Randomly select group for randomizer runs.
    let context = { groupId: 'minderlabs' };
    let itemStoreRandomizer = TestData.randomizer(database, database.getItemStore(), context);
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
    section: function(name, options) {
      if (!this.sections) { this.sections = {}; }
      this.sections[name] = options.fn(this);
    },

    toJSON: function(object) {
      return JSON.stringify(object);
    },

    toJSONPretty: function(object) {
      return TypeUtil.stringify(object, 2);
    },

    short: function(object) {
      return TypeUtil.short(object);
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
  let user = await authManager.getUserFromCookie(req);
  if (user) {
    res.redirect(Const.APP_PATH);
  } else {
    res.render('home', {
      login: true
    });
  }
});

app.get('/welcome', function(req, res) {
  res.render('home', {});
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
  contextProvider: request => authManager.getUserFromHeader(request)
    .then(user => {
      // TODO(burdon): 401 handling.
      console.assert(user, 'GraphQL request is not authenticated.');

      let userId = user.id;
      return firebase.systemStore.getGroup(userId).then(group => {
        // TODO(burdon): Client shouldn't need this (i.e., implicit by current canvas context).
        let groupId = group.id;
        return {
          groupId,
          userId
        }
      });
    })
}));


//
// Custom GraphiQL.
//

let staticPath = (env === 'production' ?
    path.join(__dirname, '../node_modules') : path.join(__dirname, '../../node_modules'));

app.use('/node_modules', express.static(staticPath));

app.get('/graphiql', function(req, res) {
  return authManager.getUserFromCookie(req)
    .then(user => {
      if (!user) {
        return res.redirect('/home');
      }

      res.render('graphiql', {
        config: {
          headers: [{
            name: 'authentication',
            value: `Bearer ${user.token}`
          }]
        }
      });
  });
});


//
// Admin.
//

// TODO(burdon): Permissions.
app.use('/admin', adminRouter(clientManager, firebase, {
  scheduler: (env === 'production')
}));


//
// App.
//

app.use('/user', loginRouter(authManager, firebase.systemStore, { env }));

app.use('/client', clientRouter(authManager, clientManager, firebase.systemStore));

app.use(appRouter(authManager, clientManager, firebase.systemStore, {

  // App root path.
  root: Const.APP_PATH,

  // Webpack assets.
  assets: (env === 'production') ? __dirname : path.join(__dirname, '../../dist'),

  // Client config.
  config: {
    env,
    app: {
      platform: Const.PLATFORM.WEB,
      name: Const.APP_NAME,
      version: Const.APP_VERSION,
    }
  }
}));

app.use('/accounts', accountsRouter(new AccountManager()
  .registerHandler('Slack', new SlackAccountHandler())));

if (botkitManager) {
  app.use('/botkit', botkitRouter(botkitManager));
}

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
    logger.log(`http://${addr.address}:${addr.port} [${env}]`);
  });
});
