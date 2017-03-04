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

import {
  ErrorUtil,
  Logger,
  TypeUtil
} from 'minder-core';

import {
  Database,
  IdGenerator,
  Matcher,
  MemoryItemStore,
  TestItemStore,
} from 'minder-core';

import {
  Firebase,
  GoogleDriveQueryProcessor,
  SlackQueryProcessor,
  graphqlRouter
} from 'minder-graphql';

import { Const, FirebaseAppConfig, GoogleApiConfig, SlackConfig } from '../common/defs';

import { adminRouter } from './admin';
import { appRouter, hotRouter } from './app';
import { accountsRouter, AccountManager, SlackAccountHandler } from './accounts';
import { loginRouter, UserManager } from './user';
import { botkitRouter, BotKitManager } from './botkit/app/manager';
import { clientRouter, ClientManager } from './client';
import { Loader } from './data/loader';
import { TestGenerator } from './data/testing';
import { testingRouter } from './testing';
import { loggingRouter } from './logger';

const logger = Logger.get('server');


//
// Error handling.
// https://nodejs.org/api/errors.html
// https://www.joyent.com/node-js/production/design/errors (Really good general error handling article).
//

function handleError(error) {
  if (error.stack) {
    logger.error('UNCAUGHT: ' + error.stack);
  } else {
    logger.error('UNCAUGHT: ' + ErrorUtil.message(error));
  }
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

const idGenerator = new IdGenerator(999);

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

// TODO(burdon): Separate itemstore, systemstore, firebase, etc. FB/memory implementation.
// TODO(burdon): Sep instance for testing.
// TODO(burdon): Rewrite alias as ID (and map items).

const userDataStore = testing ?
  new TestItemStore(new MemoryItemStore(idGenerator, matcher, Database.NAMESPACE.USER), {
    delay: 0 // TODO(burdon): Config.
  }) : firebase.itemStore;

const systemStore = firebase.systemStore;

const userManager = new UserManager(firebase.admin, systemStore);


//
// Database.
//

const settingsStore = new MemoryItemStore(idGenerator, matcher, Database.NAMESPACE.SETTINGS, false);

const database = new Database()

  .registerItemStore(systemStore)
  .registerItemStore(settingsStore)
  .registerItemStore(userDataStore)

  .registerQueryProcessor(systemStore)
  .registerQueryProcessor(settingsStore)
  .registerQueryProcessor(userDataStore)

  .onMutation(items => {
    // Notify clients of changes.
    // TODO(burdon): Create notifier abstraction.
    // clientManager.invalidateOthers();
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

const botkitManager = false && !testing && new BotKitManager({
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

let loader = new Loader(database, testing);

logger.log('Loading data...');
let loading = Promise.all([
  // Do in parallel.
  loader.parse(require('./data/accounts.json'), Database.NAMESPACE.SYSTEM),
  loader.parse(require('./data/folders.json'), Database.NAMESPACE.SETTINGS)
]).then(() => {
  logger.log('Initializing groups...');
  return loader.initGroups().then(() => {

    if (testing) {
      logger.log('Generating test data...');
      return loader.parse(require('./data/test.json')).then(() => {
        return new TestGenerator(database).generate();
      });
    }
  });
});


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
  let user = await userManager.getUserFromCookie(req);
  if (user) {
    res.redirect(Const.APP_PATH);
  } else {
    res.render('home', {
      crxId: Const.CRX_ID,
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

  // TODO(burdon): Get clientId.
  // Gets the user context from the request headers (async).
  // NOTE: The client must pass the same context shape to the matcher.
  contextProvider: request => userManager.getUserFromHeader(request)
    .then(user => {
      if (!user) {
        logger.warn('Invalid JWT in header.');
        return Promise.resolve({});
      } else {
        let userId = user.id;
        return firebase.systemStore.getGroup(userId).then(group => {
          // TODO(burdon): Client shouldn't need this (i.e., implicit by current canvas context).
          let groupId = group.id;
          return {
            groupId,
            userId
          }
        });
      }
    })
}));


//
// Custom GraphiQL.
//

let staticPath = (env === 'production' ?
    path.join(__dirname, '../node_modules') : path.join(__dirname, '../../node_modules'));

app.use('/node_modules', express.static(staticPath));

app.get('/graphiql', function(req, res) {
  return userManager.getUserFromCookie(req)
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

app.use('/user', loginRouter(userManager, firebase.systemStore, { env }));

app.use('/client', clientRouter(userManager, clientManager, firebase.systemStore));

app.use(appRouter(userManager, clientManager, firebase.systemStore, {

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
