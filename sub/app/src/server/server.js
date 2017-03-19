//
// Copyright 2016 Minder Labs.
//

import { TestConfig } from './config';

import _ from 'lodash';
import path from 'path';
import http from 'http';
import express from 'express';
import handlebars from 'express-handlebars';
import cookieParser from 'cookie-parser';
import favicon from 'serve-favicon';
import moment from 'moment';

import {
  ErrorUtil,
  Logger,
  NotAuthenticatedError,
  TypeUtil
} from 'minder-core';

import {
  Database,
  IdGenerator,
  Matcher,
  MemoryItemStore,
  SystemStore,
  TestItemStore,
} from 'minder-core';

import {
  Firebase,
  FirebaseItemStore,
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
import { loggingRouter } from './logger';
import { testingRouter } from './testing';

import { Loader } from './data/loader';
import { TestGenerator } from './data/testing';

const logger = Logger.get('server');


//
// Error handling.
//

ErrorUtil.handleErrors(process, error => {
  logger.error(error);
});


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

const firebase = new Firebase(_.pick(FirebaseAppConfig, ['databaseURL', 'credentialPath']));

//
// Database.
//

const settingsStore = new MemoryItemStore(idGenerator, matcher, Database.NAMESPACE.SETTINGS, false);

const userDataStore = testing ?
  // TODO(burdon): Config file for testing options.
  new TestItemStore(new MemoryItemStore(idGenerator, matcher, Database.NAMESPACE.USER), { delay: 0 }) :
  new FirebaseItemStore(idGenerator, matcher, firebase.db, Database.NAMESPACE.USER, true);

const systemStore = new SystemStore(
  new FirebaseItemStore(idGenerator, matcher, firebase.db, Database.NAMESPACE.SYSTEM, false));

const userManager = new UserManager(firebase, systemStore);

const database = new Database()

  .registerItemStore(systemStore)
  .registerItemStore(settingsStore)
  .registerItemStore(userDataStore)

  // TODO(burdon): Distinguish search from basic lookup (e.g., Key-range implemented by ItemStore).

  .registerQueryProcessor(systemStore)
  .registerQueryProcessor(settingsStore)
  .registerQueryProcessor(userDataStore)

  .onMutation((context, itemMutations, items) => {
    // TODO(burdon): Options.
    // TODO(burdon): QueryRegistry.
    // Notify clients of changes.
    clientManager.invalidateClients(context.clientId);
  });


//
// OAuth accounts.
// TODO(burdon): Reconcile with UserManager.
//

const accountManager = new AccountManager()
  .registerHandler('Slack', new SlackAccountHandler());


//
// External query processors.
//

database
  .registerQueryProcessor(new GoogleDriveQueryProcessor(idGenerator, GoogleApiConfig));


//
// Slack.
// NOTE: Disabled for testing since slow startup.
//

let botkitManager = null;

if (_.get(process.env, 'MINDER_BOTKIT', false)) {
  botkitManager = new BotKitManager({
    port,
    redirectHost: _.get(process.env, 'OAUTH_REDIRECT_ROOT', 'http://localhost:' + port),
    ...SlackConfig
  }, database);

  database
    .registerQueryProcessor(new SlackQueryProcessor(idGenerator, botkitManager));
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
      return new TestGenerator(database).generate();
    }
  });
});


//
// Hot loader.
// NOTE: Must come first.
//

if (env.startsWith('hot')) {
  app.use(hotRouter());
}


//
// Handlebars views.
// https://github.com/ericf/express-handlebars
//

const MINDER_VIEWS_DIR = _.get(process.env, 'MINDER_VIEWS_DIR', './views');

app.engine('handlebars', handlebars({
  layoutsDir: path.join(__dirname, MINDER_VIEWS_DIR, '/layouts'),

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
      return TypeUtil.truncate(object, 24);
    },

    time: function(object) {
      return object && moment.unix(object).fromNow();
    }
  }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, MINDER_VIEWS_DIR));


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

const MINDER_PUBLIC_DIR = _.get(process.env, 'MINDER_PUBLIC_DIR', './public');

app.use(favicon(path.join(__dirname, MINDER_PUBLIC_DIR, '/favicon.ico')));
app.use(express.static(path.join(__dirname, MINDER_PUBLIC_DIR)));


//
// Home page.
//

app.use(cookieParser());

app.get('/home', function(req, res, next) {
  return userManager.getUserFromCookie(req)
    .then(user => {
      if (user) {
        res.redirect(Const.APP_PATH);
      } else {
        res.render('home', {
          crxUrl: Const.CRX_URL(Const.CRX_ID),
          login: true
        });
      }
    })
    .catch(next);
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

  //
  // Gets the user context from the request headers (async).
  // NOTE: The client must pass the same context shape to the matcher.
  //
  contextProvider: request => userManager.getUserFromHeader(request)
    .then(user => {
      let context = {
        userId: user && user.active && user.id,
        clientId: request.headers[Const.HEADER.CLIENT_ID],
        credentials: user.credentials
      };

      if (!user) {
        return Promise.resolve(context);
      } else {
        // TODO(burdon): Get groups.
        return systemStore.getGroup(user.id).then(group => _.assign(context, {
          groupId: group.id
        }));
      }
    })
}));


//
// Custom GraphiQL.
// TODO(burdon): Move to Util (how to use handlebars in external lib?)
//

const MINDER_NODE_MODULES_DIR =
  _.get(process.env, 'MINDER_NODE_MODULES_DIR', (env === 'production') ? '../node_modules' : '../../node_modules');

app.use('/node_modules', express.static(path.join(__dirname, MINDER_NODE_MODULES_DIR)));

app.get('/graphiql', function(req, res) {
  return userManager.getUserFromCookie(req)
    .then(user => {
      if (!user) {
        return res.redirect('/home');
      }

      // See NetworkLogger.
      res.render('graphiql', {
        config: {
          headers: [
            {
              name: Const.HEADER.AUTHORIZATION,
              value: `Bearer ${user.token}`
            },
            {
              name: Const.HEADER.CLIENT_ID,
              value: req.query.clientId
            }
          ]
        }
      });
  });
});


//
// Admin.
// TODO(burdon): SECURITY: Permissions!
//

app.use('/admin', adminRouter(clientManager, firebase, {
  scheduler: (env === 'production')
}));


//
// App services.
//

app.use('/user', loginRouter(userManager, accountManager, systemStore, { env }));

app.use('/client', clientRouter(userManager, clientManager, systemStore));

if (botkitManager) {
  app.use('/botkit', botkitRouter(botkitManager));
}

app.use(accountsRouter(accountManager));

//
// Web App.
//

const MINDER_ASSETS_DIR =
  _.get(process.env, 'MINDER_ASSETS_DIR', (env === 'production') ? '.' : '../../dist');

app.use(appRouter(userManager, clientManager, systemStore, {

  // App root path.
  root: Const.APP_PATH,

  // Webpack assets.
  assets: path.join(__dirname, MINDER_ASSETS_DIR),

  // Client config.
  config: {
    env,

    app: {
      platform: Const.PLATFORM.WEB,
      name: Const.APP_NAME,
      version: Const.APP_VERSION,
    },

    // Admin users only.
    links: {
      firebase: FirebaseAppConfig.databaseURL
    }
  }
}));


//
// Catch-all (last).
//

app.use('/', function(req, res) {
  res.redirect('/home');
});


//
// File not found.
//

app.use(function(req, res) {
  logger.log(`[404]: ${req.path}`);
  res.status(404).end();
});


//
// Error handling (e.g., uncaught exceptions).
// https://expressjs.com/en/guide/error-handling.html
//
// NOTE: Must be last.
// NOTE: Async functions must call next() for subsequent middleware to be called.
//
// app.use(function(req, res, next) {
//   return new Promise((resolve, reject) => {
//     res.end();
//   }).catch(next);
// });
//
// https://strongloop.com/strongblog/async-error-handling-expressjs-es7-promises-generators/
//

app.use(function(error, req, res, next) {
  if (error === NotAuthenticatedError) {
    return res.status(401).end();
  }

  logger.error(error.stack);
  res.status(500).end();
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
