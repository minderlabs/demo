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

import graphqlHTTP from 'express-graphql';  // TODO(burdon): Figure out logging issue below.
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';

import { Util } from '../common/util';

import Resolvers from '../data/resolvers';
import Database from '../data/database';
import Randomizer from '../data/testing/randomizer';
import TypeDefs from '../data/schema.graphql';


// Emulate browser atob and btoa.
// TODO(burdon): Inject wrapper.
global.btoa = function (str) { return new Buffer(str).toString('base64'); };
global.atob = function (str) { return new Buffer(str, 'base64').toString(); };


//
// Env
//

const env = process.env['NODE_ENV'] || 'development';
const host = (env === 'production') ? '0.0.0.0' : '127.0.0.1';
const port = process.env['VIRTUAL_PORT'] || 3000;


//
// Express
//

const app = express();


//
// Webpack Hot Module Replacement (HMR)
// NOTE: This replaces the stand-alone webpack-dev-server
//
// http://madole.github.io/blog/2015/08/26/setting-up-webpack-dev-middleware-in-your-express-application
// http://webpack.github.io/docs/hot-module-replacement-with-webpack.html
// https://github.com/gaearon/react-hot-loader/tree/master/docs#starter-kits
// https://github.com/gaearon/react-hot-boilerplate/issues/102
//
// TODO(burdon): Webpack 2?
// NOTE: Hot mode cannot work with nodemon (must manually reload).
// npm run webpack-dev-server
//
// NOTE: CSS changes will not rebuild (since in separate bundle).
//

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
// Schema and Database
//

let database = new Database();

// TODO(burdon): From JSON file.
database.upsertItems([
  {
    id: 'rich',
    type: 'User',
    title: 'Rich Burdon',
    email: 'rich'
  },
  {
    id: 'adam',
    type: 'User',
    title: 'Adam Berenzweig',
    email: 'adam'
  },
  {
    id: 'matt',
    type: 'User',
    title: 'Matt Sullivan',
    email: 'matt@carbonfive.com',
  }
]);

database.upsertItems([
  {
    id: 'inbox',
    type: 'Folder',
    title: 'Inbox'
  },
  {
    id: 'favorites',
    type: 'Folder',
    title: 'Favorites',
    filter: {
      labels: ['_favorite']
    }
  },
]);

// TODO(burdon): Trigger from webhook.
new Randomizer(database)
  .generate('Task',   20)
  .generate('Place', 100);


//
// GraphQL
// https://github.com/apollostack/graphql-server
// https://github.com/graphql/express-graphql#options
// http://dev.apollodata.com/tools/graphql-server/index.html
//

app.use(bodyParser.json());                           // JSON post (GraphQL).
app.use(bodyParser.urlencoded({ extended: true }));   // Encoded bodies (Form post).

const schema = makeExecutableSchema({
  typeDefs: TypeDefs,
  resolvers: Resolvers(database),
  logger: {
    log: (error) => console.log('Schema Error', error)
  }
});


//
// Logging
// TODO(burdon): Factor out (PR for graphql-server-express)?
// TODO(burdon): winston logging (loggly)
//

const graphqlLogger = (options={ logging: true, pretty: false }) => {
  return (req, res, next) => {
    if (options.logging) {

      let stringify = options.pretty ?
        (json) => JSON.stringify(json, 0, 2) :
        (json) => JSON.stringify(json, Util.JSON_REPLACER, 0);

      let { operationName, query, variables } = req.body;

      let input = {
        operationName,
        query: query.replace(/\s*\n\s*/g, ' '),
        variables
      };

      console.log('>>> REQ: [%s]', stringify(input));

      let original = res.end;
      res.end = (json) => {
        console.log('<<< RES: [%s]', stringify(JSON.parse(json)));
        return original.call(res, json);
      };
    }

    next();
  }
};


const router = express.Router();
router.use('/graphql', graphqlLogger());
app.use('/', router);


//
// GraphQL server.
// TODO(burdon): Logging doesn't work with graphqlExpress.
//

app.use('/graphql', graphqlHTTP({
  schema: schema,
  pretty: true,
  formatError: error => ({
    message: error.message,
    locations: error.locations,
    stack: error.stack
  })
}));

app.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
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

const server = http.Server(app);

server.listen(port, host, () => {
  let addr = server.address();
  console.log(`### RUNNING[${env}] http://${addr.address}:${addr.port} ###`);
});
