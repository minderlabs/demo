//
// Copyright 2016 Minder Labs.
//

import './config';

import _ from 'lodash';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import session from 'express-session';
import handlebars from 'express-handlebars';
import favicon from 'serve-favicon';
import http from 'http';
import moment from 'moment';
import path from 'path';

import {
  ErrorUtil,
  HttpError,
  Logger,
  TypeUtil
} from 'minder-core';

// TODO(burdon): minder-data.
import {
  Database,
  IdGenerator,
  Matcher,
  MemoryItemStore,
  SystemStore,
  TestItemStore,
} from 'minder-core';

import {
  isAuthenticated,
  oauthRouter,
  loginRouter,

  OAuthProvider,
  OAuthRegistry,
  ServiceRegistry,
  UserManager,

  GoogleOAuthProvider,
  GoogleDriveQueryProcessor,
  GoogleDriveServiceProvider,

  SlackServiceProvider,
  SlackQueryProcessor
} from 'minder-services';

import {
  Firebase,
  FirebaseItemStore,
  graphqlRouter
} from 'minder-graphql';

import { Const, FirebaseAppConfig, GoogleApiConfig, SlackConfig } from '../common/defs';

import { adminRouter } from './admin';
import { webAppRouter, hotRouter } from './app';
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

// NOTE: Want repeatable IDs in dev but not production.
const idGenerator = new IdGenerator((env !== 'production') && 1000);

const clientManager = new ClientManager(idGenerator);

const matcher = new Matcher();


//
// Firebase
// https://firebase.google.com/docs/database/admin/start
//

const firebase = new Firebase(_.pick(FirebaseAppConfig, ['databaseURL', 'credentialPath']));


//
// OAuth providers.
//

const googleAuthProvider =
  new GoogleOAuthProvider(GoogleApiConfig, GoogleApiConfig.authScopes, env !== 'production');

const oauthRegistry = new OAuthRegistry()
  .registerProvider(googleAuthProvider);


//
// Service providers.
//

const serviceRegistry = new ServiceRegistry()
  .registerProvider(new GoogleDriveServiceProvider(googleAuthProvider))
  .registerProvider(new SlackServiceProvider());


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

const userManager = new UserManager(googleAuthProvider, systemStore);

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

  // TODO(burdon): Factor out.
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
  // TODO(burdon): Implement prod logging.
  app.use('/', loggingRouter({}));
} else {
  app.use((req, res, next) => {
    if (req.method === 'POST') {
      logger.log(req.method, req.url);
    }

    // Continue to actual route.
    next();
  });
}


//
// Middleware.
//

const MINDER_PUBLIC_DIR = _.get(process.env, 'MINDER_PUBLIC_DIR', './public');

// https://expressjs.com/en/starter/static-files.html
app.use(favicon(path.join(__dirname, MINDER_PUBLIC_DIR, '/favicon.ico')));
app.use(express.static(path.join(__dirname, MINDER_PUBLIC_DIR)));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser());  // TODO(burdon): Remove (moved to passport).

// https://github.com/expressjs/session
app.use(session({
  secret: 'minder-secret',                      // TODO(burdon): Move to Const.
  resave: false,                                // Don't write to the store if not modified.
  saveUninitialized: false                      // Don't save new sessions that haven't been initialized.
}));


//
// App services.
// TODO(burdon): Factor out path constants (e.g., OAuthProvider.PATH).
//

// NOTE: This must be defined ("used') before other services.
app.use(OAuthProvider.PATH, oauthRouter(userManager, systemStore, oauthRegistry, { app, env }));

app.use('/user', loginRouter(userManager, oauthRegistry, systemStore, {
  env,
  crxUrl: Const.CRX_URL(Const.CRX_ID)
}));

app.use('/client', clientRouter(userManager, clientManager, systemStore));

if (botkitManager) {
  app.use('/botkit', botkitRouter(botkitManager));
}


//
// Home page.
//

app.get('/home', function(req, res) {
  res.render('home', {
    crxUrl: Const.CRX_URL(Const.CRX_ID),
    login: true
  });
});

app.get('/welcome', isAuthenticated('/home'), function(req, res) {
  res.render('home', {});
});

app.get('/services', isAuthenticated('/home'), function(req, res) {
  res.render('services', {
    providers: serviceRegistry.providers
  });
});


//
// GraphQL
//

app.use(graphqlRouter(database, {
  logging: true,
  pretty: false,

  // Use custom UX provided below.
  graphiql: false,

  // Asynchronously provides the request context.
  contextProvider: req => userManager.getUserFromHeader(req.headers, true).then(user => {

    // The database context (different from the Apollo context).
    // NOTE: The client must pass the same context shape to the matcher.
    let context = {
      userId: user && user.active && user.id,
      clientId: req.headers[Const.HEADER.CLIENT_ID],
      credentials: user.credentials
    };

    if (!user) {
      return Promise.resolve(context);
    } else {
      // TODO(burdon): Change to groups (update resolvers, matcher, query, etc.)
      return systemStore.getGroup(user.id).then(group => {
        return _.assign(context, {
          groupId: group.id
        })
      });
    }
  })
}));


//
// Testing.
//

if (env !== 'production') {

  //
  // Custom GraphiQL.
  // TODO(burdon): Move to Util (how to use handlebars in external lib?)
  //

  const MINDER_NODE_MODULES_DIR =
    _.get(process.env, 'MINDER_NODE_MODULES_DIR', (env === 'production') ? '../node_modules' : '../../node_modules');

  app.get('/node_modules', express.static(path.join(__dirname, MINDER_NODE_MODULES_DIR)));

  app.get('/graphiql', isAuthenticated(), function(req, res) {
    let idToken = userManager.getIdToken(req.user);
    console.assert(idToken, 'Invalid token.');

    res.render('graphiql', {
      config: {
        headers: [
          {
            name: 'Authorization',
            value: UserManager.createIdHeader(idToken)
          },
          {
            name: Const.HEADER.CLIENT_ID,
            value: req.query.clientId
          }
        ]
      }
    });
  });

  app.use('/testing', testingRouter({}));
}


//
// Admin.
//

app.use('/admin', adminRouter(clientManager, firebase, {
  scheduler: (env === 'production')
}));


//
// Web App.
//

const MINDER_ASSETS_DIR =
  _.get(process.env, 'MINDER_ASSETS_DIR', (env === 'production') ? '.' : '../../dist');

app.use(webAppRouter(userManager, clientManager, systemStore, {

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
// Server status.
//

app.get('/status', function(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({
    env,
    version: Const.APP_VERSION
  }, null, 2));
});


//
// Redirect root.
//

app.get('/', function(req, res) {
  res.redirect('/home');
});


//
// Error handling middleware (e.g., uncaught exceptions).
// https://expressjs.com/en/guide/error-handling.html
// https://strongloop.com/strongblog/async-error-handling-expressjs-es7-promises-generators/
// https://expressjs.com/en/starter/faq.html
//
// NOTE: Must be last.
// NOTE: Must have all 4 args (error middleware signature).
// NOTE: Async functions must call next() for subsequent middleware to be called.
//
// app.get(function(req, res, next) {
//   return new Promise((resolve, reject) => {
//     res.end();
//   }).catch(next);
// });
//

app.use(function(req, res, next) {
  throw new HttpError(404);
});

app.use(function(err, req, res, next) {
  let json = _.startsWith(req.headers['content-type'], 'application/json');

  let code = err.code || 500;
  if (code >= 500 || env !== 'production') {
    logger.error(`[${req.method} ${req.url}]:`, err);

    if (json) {
      res.status(code).end();
    } else {
      // TODO(burdon): User facing page in prod.
      res.render('error', { code, err });
    }
  } else {
    logger.warn(`[${req.method} ${req.url}]:`, ErrorUtil.message(err));

    if (json) {
      res.status(err.code).end();
    } else {
      res.redirect('/');
    }
  }
});


//
// Intitialize database.
//

// TODO(burdon): Remove from server startup except for testing. Use tools to configure DB.
// TODO(burdon): parse initial "default" projects JSON file (add label and set default project in context).

let loader = new Loader(database, testing);
let loading = Promise.all([
  // Do in parallel.
  loader.parse(require('./data/accounts.json'), Database.NAMESPACE.SYSTEM, /^(Group)\.(.+)\.(.+)$/),
  loader.parse(require('./data/folders.json'), Database.NAMESPACE.SETTINGS, /^(Folder)\.(.+)$/)
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
// Start-up.
//

loading.then(() => {
  logger.log('Starting minder-app-server');

  server.listen(port, host, () => {
    let addr = server.address();
    logger.log(`http://${addr.address}:${addr.port} [${env}]`);
  });
});
