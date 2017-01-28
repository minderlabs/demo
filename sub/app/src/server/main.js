//
// Copyright 2016 Minder Labs.
//

import './config';

import _ from 'lodash';
import moment from 'moment';

import path from 'path';
import http from 'http';
import express from 'express';
import handlebars from 'express-handlebars';
import cookieParser from 'cookie-parser';
import favicon from 'serve-favicon';

import { IdGenerator, Matcher, MemoryItemStore, Logger, Randomizer, TypeUtil } from 'minder-core';
import { Database, Firebase, GoogleDriveItemStore, graphqlRouter } from 'minder-graphql';

import { Const, FirebaseConfig, GoogleApiConfig } from '../common/defs';

import { adminRouter } from './admin';
import { appRouter, hotRouter } from './app';
import { loginRouter, AuthManager } from './auth';
import { clientRouter, ClientManager, SocketManager } from './client';
import { testingRouter } from './testing';
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

const app = express();

const server = http.Server(app);

const socketManager = new SocketManager(server);

const clientManager = new ClientManager(socketManager);

const idGenerator = new IdGenerator(1000);

const matcher = new Matcher();


// TODO(burdon): Factor out const.
// https://firebase.google.com/docs/database/admin/start
const firebase = new Firebase(idGenerator, matcher, {

  databaseURL: FirebaseConfig.databaseURL,

  // Download JSON config.
  // https://console.firebase.google.com/project/minder-beta/settings/serviceaccounts/adminsdk
  // NOTE: Path must work for dev and prod (docker).
  credentialPath: path.join(__dirname, 'conf/minder-beta-firebase-adminsdk-n6arv.json')
});

const authManager = new AuthManager(firebase.admin, firebase.userStore);


//
// Database.
//

const defaultItemStore = testing ? new MemoryItemStore(idGenerator, matcher) : firebase.itemStore;

const database = new Database(idGenerator, matcher)

  .registerItemStore('User', firebase.userStore)
  .registerItemStore(Database.DEFAULT, defaultItemStore)

  .registerSearchProvider(Database.DEFAULT, defaultItemStore)

  .onMutation(() => {
    // Notify clients of changes.
    // TODO(burdon): Create notifier abstraction.
    clientManager.invalidateOthers();
  });


//
// Google
//

const googleDriveItemStore = new GoogleDriveItemStore(idGenerator, matcher, GoogleApiConfig);

database
  // TODO(madadam): Keep this? Convenient for testing: e.g. "@Document foo".
  .registerItemStore('Document', googleDriveItemStore)

  // TODO(madadam): Introduce new SearchProvider interface? For now re-using ItemStore.
  .registerSearchProvider('google_drive', googleDriveItemStore);


//
// Testing.
//

let context = {
  user: {
    id: null
  }
};

// Load test data.
_.each(require('./testing/test.json'), (items, type) => {

  // Iterate items per type.
  database.upsertItems(context, _.map(items, (item) => {

    // NOTE: The GraphQL schema defines filter as an input type.
    // In order to "store" the filter within the Folder's filter property, we need
    // to serialize it to a string (otherwise we need to create parallel output type defs).
    if (type == 'Folder') {
      item.filter = JSON.stringify(item.filter);
    }

    return { type, ...item };
  }));
});


//
// Create test data.
// TODO(burdon): Factor out.
//

// TODO(burdon): Use injector pattern (esp for async startup).
let promises = [];

promises.push(database.queryItems(context, {}, { type: 'User' })

  .then(users => {
    // Get the group and add members.
    return database.getItem(context, 'Group', Const.DEF_TEAM)
      .then(group => {
        group.members = _.map(users, user => user.id);
        return database.upsertItem(context, group);
      });
  })

  .then(group => {
    // TODO(burdon): Is this needed in the GraphQL context below?
    context.group = group;

    //
    // Generate test data.
    //

    if (testing) {
      // TODO(burdon): Pass query registry into Randomizer.
      let randomizer = new Randomizer(database, _.defaults(context, {
        created: moment().subtract(10, 'days').unix()
      }));

      return Promise.all([
        randomizer.generate('Task', 30, {

          status: () => randomizer.chance.natural({ min: 0, max: 3 }),

          project: {
            type: 'Project',
            likelihood: 0.75,

            // Fantastically elaborate mechanism to create bi-directional links (add tasks to project).
            onCreate: (randomizer, tasks) => {
              let mutatedProjects = {};
              return TypeUtil.iterateWithPromises(tasks, task => {

                // Add to project.
                let projectId = task.project;
                if (projectId) {
                  return randomizer.queryCache({ ids: [ projectId ] }).then(projects => {
                    let project = projects[0];
                    project.tasks = TypeUtil.maybeAppend(project.tasks, task.id);
                    mutatedProjects[project.id] = project;
                  }).then(() => {

                    // Create sub-tasks.
                    if (randomizer.chance.bool({ likelihood: 30 })) {
                      randomizer.generate('Task', randomizer.chance.natural({ min: 1, max: 3 }), {
                        status: () => randomizer.chance.bool({ likelihood: 50 }) ? 0 : 3,
                      }).then(tasks => {

                        // Add sub-tasks to parent task.
                        task.tasks = _.map(tasks, task => task.id);
                        return randomizer.upsertItems([task]);
                      });
                    }
                  });
                }
              }).then(() => {
                return randomizer.upsertItems(Object.values(mutatedProjects));
              });
            }
          },

          owner: {
            type: 'User',
            likelihood: 1.0
          },

          assignee: {
            type: 'User',
            likelihood: 0.5
          }
        }),

        randomizer.generate('Contact', 10),
        randomizer.generate('Place', 10)
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


//
// GraphQL
//

app.use(graphqlRouter(database, {
  logging: true,
  pretty: false,
  graphiql: false,    // Use custom below.

  // TODO(burdon): Check authenticated.
  // Gets the user context from the request headers (async).
  // NOTE: The client must pass the same context shape to the matcher.
  context: req => authManager.getUserInfoFromHeader(req)
    .then(userInfo => {
      if (!userInfo) {
        console.error('GraphQL request is not authenticated.');
      }

      return {
        user: userInfo
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

app.use(loginRouter(firebase.userStore, {
  env
}));

app.use(adminRouter(clientManager, firebase));

app.use(clientRouter(authManager, clientManager, server));

app.use(appRouter(authManager, clientManager, {
  env,

  // Additional config params.
  config: {
    app: {
      name: Const.APP_NAME,
      version: Const.APP_VERSION,
    },

    team: Const.DEF_TEAM
  },

  // TODO(burdon): Clean this up with config.
  assets: env === 'production' ? __dirname : path.join(__dirname, '../../dist')
}));

// Catch-all (last).
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

// TODO(burdon): Perform in order?
Promise.all(promises).then(() => {
  logger.log('STARTING...');

  server.listen(port, host, () => {
    let addr = server.address();
    logger.log(`RUNNING[${env}] http://${addr.address}:${addr.port}`);
  });
});