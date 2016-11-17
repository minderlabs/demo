//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';

import path from 'path';
import http from 'http';
import express from 'express';
import handlebars from 'express-handlebars';
import bodyParser from 'body-parser';
import moment from 'moment';

import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';

import { graphqlLogger, loggingRouter } from 'minder-graphql';

import SchemaFactory from '../data/schema';
import Database from '../data/database';
import Randomizer from '../data/testing/randomizer';


// Emulate browser atob and btoa.
// TODO(burdon): Inject wrapper; move to core.
global.btoa = function (str) { return new Buffer(str).toString('base64'); };
global.atob = function (str) { return new Buffer(str, 'base64').toString(); };


//
// Env
//

const env = process.env['NODE_ENV'] || 'development';
const host = (env === 'production') ? '0.0.0.0' : '127.0.0.1';
const port = process.env['VIRTUAL_PORT'] || 3000;


//
// Schema and Database
//

let database = new Database();

const data = require('../data/testing/test.json');

// System data.
_.each(data, (items, type) => {
  database.upsertItems(_.map(items, (item) => ({ type, ...item })));
});

// TODO(burdon): Trigger from webhook.
new Randomizer(database)
  .generate('Task', 20,
    {
      owner:    { type: 'User', likelihood: 1.0 },
      assignee: { type: 'User', likelihood: 0.5 }
    }
  )
  .generate('Contact', 20)
  .generate('Place',   10);


//
// Allow async start.
//

let promises = [];


//
// Express
//

const app = express();


//
// Logging
//

app.use('/', loggingRouter());


//
// Webpack Hot Module Replacement (HMR)
// NOTE: This replaces the stand-alone webpack-dev-server
//
// http://madole.github.io/blog/2015/08/26/setting-up-webpack-dev-middleware-in-your-express-application
// http://webpack.github.io/docs/hot-module-replacement-with-webpack.html
// https://github.com/gaearon/react-hot-loader/tree/master/docs#starter-kits
// https://github.com/gaearon/react-hot-boilerplate/issues/102 [Resolved]
//
// TODO(burdon): Webpack 2?
// NOTE: Hot mode cannot work with nodemon (must manually reload).
//
// NOTE: CSS changes will not rebuild (since in separate bundle).
//

// TODO(burdon): Factor out.
if (env === 'hot') {
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');

  // Config.
  const webpackConfig = require('../../webpack.config');

  const compiler = webpack(webpackConfig);

  // https://github.com/webpack/webpack-dev-middleware
  app.use(webpackDevMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    noInfo: true,
    stats: { colors: true }
  }));

  // https://github.com/glenjamin/webpack-hot-middleware
  app.use(webpackHotMiddleware(compiler, {
    log: (msg) => console.log('### [%s] %s ###', moment().format('hh:mm:ss'), msg)
  }));
}


//
// GraphQL server.
// https://github.com/apollostack/graphql-server
// https://github.com/graphql/express-graphql#options
// http://dev.apollodata.com/tools/graphql-server/index.html
//

promises.push(new SchemaFactory(database).makeExecutableSchema().then((schema) => {
  console.assert(schema);

  // TODO(burdon): Checkout graphqlHTTP.getGraphQLParams to augment request/response.

  // MIME type.
  app.use(bodyParser.json());                           // JSON post (GraphQL).
  app.use(bodyParser.urlencoded({ extended: true }));   // Encoded bodies (Form post).

  // Log GraphQL (debug-only).
  app.use('/graphql', graphqlLogger());

  // Bind server.
  // https://github.com/graphql/express-graphql
  app.use('/graphql', graphqlExpress({
    schema: schema,
    pretty: true,
    formatError: error => ({
      message: error.message,
      locations: error.locations,
      stack: error.stack
    })
  }));

  // Bind debug UX.
  app.use('/graphiql', graphiqlExpress({
    endpointURL: '/graphql',
  }));
}));


//
// App
//

const WEBPACK_ENTRY = {
  "development":  "main",
  "production":   "main",
  "hot":          "hot"
};

app.use('/assets', express.static(path.join(__dirname, '../../dist')));

app.get(/^\/(.*)/, function(req, res) {
  res.render('home', {
    app: WEBPACK_ENTRY[env],
    config: {
      root: 'app-root',
      graphql: '/graphql',
      userId: Database.toGlobalId('User', 'rich'),    // TODO(burdon): cookie.
      debug: {
        env: env
      }
    }
  });
});


//
// Handlebars.
// https://github.com/ericf/express-handlebars
//

app.engine('handlebars', handlebars({
  helpers: {
    toJSON : function(object) {
      return JSON.stringify(object);
    }
  }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));


//
// Start-up
//

Promise.all(promises).then(() => {
  const server = http.Server(app);

  server.listen(port, host, () => {
    let addr = server.address();
    console.log(`### RUNNING[${env}] http://${addr.address}:${addr.port} ###`);
  });
});

