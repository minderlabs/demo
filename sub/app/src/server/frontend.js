//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import favicon from 'serve-favicon';
import handlebars from 'express-handlebars';
import http from 'http';
import path from 'path';
import session from 'express-session';
import uuid from 'node-uuid';

import {
  AuthUtil,
  Database,
  ErrorUtil,
  ExpressUtil,
  IdGenerator,
  Logger,
  Matcher,
  MemoryItemStore,
  SystemStore,
  TestItemStore,
  HttpError
} from 'minder-core';

import {
  getIdToken,
  isAuthenticated,
  oauthRouter,
  userRouter,

  OAuthProvider,
  OAuthRegistry,
  ServiceRegistry,
  UserManager,

  GoogleOAuthProvider,
  GoogleDriveQueryProcessor,
  GoogleDriveServiceProvider,
  GoogleMailServiceProvider,

  SlackServiceProvider,
  SlackQueryProcessor
} from 'minder-services';

import {
  Firebase,
  FirebaseItemStore,
  graphqlRouter
} from 'minder-graphql';

import { Const } from '../common/const';

import { adminRouter } from './admin';
import { webAppRouter, hotRouter } from './app';
import { botkitRouter, BotKitManager } from './botkit/app/manager';
import { clientRouter, ClientManager } from './client';
import { loggingRouter } from './logger';
import { testingRouter } from './testing';

import { Loader } from './data/loader';
import { TestGenerator } from './data/testing';

import ENV from './env';

const logger = Logger.get('frontend');

/**
 * Frontend server.
 */
export default class Frontend {

  constructor(config) {
    this._config = config;

    logger.info('Config = ' + JSON.stringify(this._config, null, 2));

    //
    // Express server.
    //

    this._app = express();
  }

  /**
   * Initialize everything.
   * @return {Promise.<Frontend>}
   */
  async init() {

    await this.initDatabase();
    await this.initMiddleware();
    await this.initAuth();
    await this.initServices();

    if (ENV.MINDER_BOTKIT) {
      await this.initSlack();
    }

    await this.initApp();
    await this.initApi();

    if (__TESTING__) {
      await this.initDebugging();
    }

    await this.initHandlebars();
    await this.initPages();
    await this.initAdmin();

    await this.initErrorHandling();

    await this.reset();

    return this;
  }

  /**
   * Database and query processors.
   */
  initDatabase() {

    // NOTE: The seed provide repeatable IDs in dev but not production.
    this._idGenerator = new IdGenerator(!__PRODUCTION__ && 1234);

    // Query item matcher.
    this._matcher = new Matcher();

    // Firebase
    // https://firebase.google.com/docs/database/admin/start
    this._firebase = new Firebase({
      databaseURL: _.get(this._config, 'firebase.databaseURL'),
      credentialPath: path.join(ENV.MINDER_CONF_DIR, _.get(this._config, 'firebase.credentialPath'))
    });

    //
    // Database.
    //

    this._settingsStore = new MemoryItemStore(this._idGenerator, this._matcher, Database.NAMESPACE.SETTINGS, false);

    this._userDataStore = __TESTING__ ?
      // TODO(burdon): Config file for testing options.
      new TestItemStore(new MemoryItemStore(this._idGenerator, this._matcher, Database.NAMESPACE.USER), { delay: 0 }) :
      new FirebaseItemStore(new IdGenerator(), this._matcher, this._firebase.db, Database.NAMESPACE.USER, true);

    this._systemStore = new SystemStore(
      new FirebaseItemStore(new IdGenerator(), this._matcher, this._firebase.db, Database.NAMESPACE.SYSTEM, false));

    this._database = new Database()

      .registerItemStore(this._systemStore)
      .registerItemStore(this._settingsStore)
      .registerItemStore(this._userDataStore)

      // TODO(burdon): Distinguish search from basic lookup (e.g., Key-range implemented by ItemStore).

      .registerQueryProcessor(this._systemStore)
      .registerQueryProcessor(this._settingsStore)
      .registerQueryProcessor(this._userDataStore)

      .onMutation((context, itemMutations, items) => {
        // TODO(burdon): Options.
        // TODO(burdon): QueryRegistry.
        // Notify clients of changes.
        this._clientManager.invalidateClients(context.clientId);
      });

    //
    // External query processors.
    //

    this._database
      .registerQueryProcessor(new GoogleDriveQueryProcessor(this._idGenerator, _.get(this._config, 'google')));
  }

  /**
   * Authentication and user/client management.
   */
  initAuth() {

    this._googleAuthProvider = new GoogleOAuthProvider(_.get(this._config, 'google'), ENV.MINDER_SERVER_URL);

    // TODO(burdon): Rename LoginRegistry?
    this._oauthRegistry = new OAuthRegistry()
      .registerProvider(this._googleAuthProvider);

    // User manager.
    this._userManager = new UserManager(this._googleAuthProvider, this._systemStore);

    // TODO(burdon): Factor out path constants (e.g., OAuthProvider.PATH).
    // NOTE: This must be defined ("used') before other services.
    this._app.use(OAuthProvider.PATH, oauthRouter(this._userManager, this._systemStore, this._oauthRegistry, {
      app: this._app,
      env: __ENV__
    }));

    // User registration.
    this._app.use('/user', userRouter(this._userManager, this._oauthRegistry, this._systemStore, {
      env: __ENV__,
      crxUrl: _.get(this._config, 'app.crxUrl')
    }));
  }

  /**
   * Application services.
   */
  initServices() {

    // Service registry.
    this._serviceRegistry = new ServiceRegistry()
      .registerProvider(new GoogleDriveServiceProvider(this._googleAuthProvider))
      .registerProvider(new GoogleMailServiceProvider(this._googleAuthProvider))
      .registerProvider(new SlackServiceProvider());

    // Client manager.
    this._clientManager = new ClientManager(this._config, this._idGenerator);

    // Client registration.
    this._app.use('/client', clientRouter(this._userManager, this._clientManager, this._systemStore));
  }

  /**
   * Slackbot and query processor.
   */
  initSlack() {
    let config = _.assign({
      redirectHost: ENV.MINDER_SERVER_URL,
      port: ENV.PORT,
    }, _.get(this._config, 'slack'));

    this._botkitManager = new BotKitManager(config, this._database);

    this._database
      .registerQueryProcessor(new SlackQueryProcessor(this._idGenerator, this._botkitManager));

    this._app.use('/botkit', botkitRouter(this._botkitManager));
  }

  /**
   * Client application.
   */
  initApp() {

    //
    // Hot loader.
    // NOTE: Must come above other asset handlers.
    //
    if (__HOT__) {
      this._app.use(hotRouter());
    }

    this._app.use(webAppRouter(this._userManager, this._clientManager, this._systemStore, {

      // Webpack assets.
      assets: ENV.MINDER_ASSETS_DIR,

      // App root path.
      root: Const.APP_PATH,

      // Client config.
      config: {
        env: __ENV__,

        app: {
          platform:   Const.PLATFORM.WEB,
          name:       Const.APP_NAME,
          version:    Const.APP_VERSION,
        },

        // Admin users only.
        links: {
          firebase: _.get(this._config, 'firebase.databaseURL')
        }
      }
    }));
  }

  /**
   * Data API.
   */
  initApi() {

    //
    // GraphQL API.
    //
    this._app.use(graphqlRouter(this._database, {
      logging: true,

      pretty: false,

      // Use custom UX provided below.
      graphiql: false,

      // Asynchronously provides the request context.
      contextProvider: (req) => {
        let user = req.user;
        console.assert(user);

        // The database context (different from the Apollo context).
        // NOTE: The client must pass the same context shape to the matcher.
        let context = {
          userId: user && user.active && user.id,
          clientId: req.headers[Const.HEADER.CLIENT_ID],
          credentials: user.credentials
        };

        // Assign buckets.
        if (!user) {
          return Promise.resolve(context);
        } else {
          return this._systemStore.getGroups(user.id).then(groups => {
            return _.assign(context, {
              buckets: _.map(groups, group => group.id)
            })
          });
        }
      }
    }));

    //
    // Status and healthcheck.
    //
    this._app.get('/status', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({
        env: __ENV__,
        version: Const.APP_VERSION
      }, null, 2));
    });
  }

  /**
   * Debugging.
   */
  initDebugging() {

    this._app.get('/node_modules', express.static(ENV.MINDER_NODE_MODULES));

    // Custom GraphiQL.
    // TODO(burdon): Move to Util (how to use handlebars in external lib?)
    this._app.get('/graphiql', isAuthenticated(), (req, res) => {

      let headers = {};
      AuthUtil.setAuthHeader(headers, getIdToken(req.user));
      headers[Const.HEADER.CLIENT_ID] = req.query.clientId;

      res.render('graphiql', {
        config: {
          headers
        }
      });
    });

    this._app.use('/testing', testingRouter({}));
  }

  /**
   * Express middleware.
   */
  initMiddleware() {

    //
    this._app.use(favicon(path.join(ENV.MINDER_PUBLIC_DIR, '/favicon.ico')));

    // https://expressjs.com/en/starter/static-files.html
    this._app.use(express.static(ENV.MINDER_PUBLIC_DIR));

    //
    this._app.use(bodyParser.urlencoded({ extended: false }));
    this._app.use(bodyParser.json());

    //
    this._app.use(cookieParser());

    //
    this._app.use(session({
      secret: ENV.MINDER_SESSION_SECRET,
      resave: false,                        // Don't write to the store if not modified.
      saveUninitialized: false,             // Don't save new sessions that haven't been initialized.
      genid: req => uuid.v4()
    }));

    // Logging.
    // TODO(burdon): Prod logging.
    if (__PRODUCTION__ && false) {
      this._app.use('/', loggingRouter({}));
    } else {
      this._app.use((req, res, next) => {
        if (req.method === 'POST') {
          logger.log(req.method, req.url);
        }

        // Continue to actual route.
        next();
      });
    }
  }

  /**
   * Handlebars.
   * https://github.com/ericf/express-handlebars
   */
  initHandlebars() {

    this._app.engine('handlebars', handlebars({
      layoutsDir: path.join(ENV.MINDER_VIEWS_DIR, '/layouts'),
      defaultLayout: 'main',
      helpers: ExpressUtil.Helpers
    }));

    this._app.set('view engine', 'handlebars');
    this._app.set('views', ENV.MINDER_VIEWS_DIR);
  }

  /**
   * Handlebars pages.
   */
  initPages() {

    this._app.get('/', (req, res) => {
      res.redirect('/home');
    });

    this._app.get('/home', (req, res) => {
      res.render('home', {
        crxUrl: _.get(this._config, 'app.crxUrl'),
        login: true
      });
    });

    this._app.get('/welcome', isAuthenticated('/home'), (req, res) => {
      res.render('home', {});
    });

    this._app.get('/services', isAuthenticated('/home'), (req, res) => {
      res.render('services', {
        providers: this._serviceRegistry.providers
      });
    });
  }

  /**
   * Admin pages and services.
   */
  initAdmin() {

    this._app.use('/admin', adminRouter(this._clientManager, this._firebase, {

      scheduler: ENV.MINDER_SCHEDULER,

      handleDatabaseDump: (__PRODUCTION__ ? () => {
        return this._userDataStore.dump().then(debug => {
          logger.log('Database:\n', JSON.stringify(debug, null, 2));
        });
      } : null),

      handleDatabaseReset: (__PRODUCTION__ ? () => {
        return this.reset();
      } : null)
    }));
  }

  /**
   * Error handling middleware (e.g., uncaught exceptions).
   * https://expressjs.com/en/guide/error-handling.html
   * https://strongloop.com/strongblog/async-error-handling-expressjs-es7-promises-generators/
   * https://expressjs.com/en/starter/faq.html
   *
   * NOTE: Must be last.
   * NOTE: Must have all 4 args (error middleware signature).
   * NOTE: Async functions must call next() for subsequent middleware to be called.
   *
   * app.get((req, res, next) => {
   *   return new Promise((resolve, reject) => {
   *     res.end();
   *   }).catch(next);
   * });
   */
  initErrorHandling() {

    // Handle missing resource.
    this._app.use((req, res, next) => {
      throw new HttpError(404);
    });

    // Handle errors.
    this._app.use((err, req, res, next) => {
      let json = _.startsWith(req.headers['content-type'], 'application/json');

      let code = err.code || 500;
      if (code >= 500 || __PRODUCTION__) {
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
  }

  /**
   *
   */
  reset() {
    _.each([ Database.NAMESPACE.USER, Database.NAMESPACE.SETTINGS ], namespace => {
      this._database.getItemStore(namespace).clear();
    });

    let loader = new Loader(this._database);
    return Promise.all([
      // TODO(burdon): Testing only?
      loader.parse(require(
        path.join(ENV.MINDER_DATA_DIR, './accounts.json')), Database.NAMESPACE.SYSTEM, /^(Group)\.(.+)\.(.+)$/),
      loader.parse(require(
        path.join(ENV.MINDER_DATA_DIR, './folders.json')), Database.NAMESPACE.SETTINGS, /^(Folder)\.(.+)$/)
    ]).then(() => {
      logger.log('Initializing groups...');
      return loader.initGroups().then(() => {
        if (__TESTING__) {
          logger.log('Generating test data...');
          return new TestGenerator(this._database).generate();
        }
      });
    });
  }

  /**
   *
   * @return {Promise.<Frontend>}
   */
  start() {
    return new Promise((resolve, reject) => {
      this._server = http.Server(this._app);
      this._server.listen(ENV.PORT, ENV.HOST, () => {
        let addr = this._server.address();
        logger.info(`http://${addr.address}:${addr.port} [${__ENV__}]`);
        resolve(this);
      });
    });
  }
}
