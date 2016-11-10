//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import path from 'path';
import http from 'http';
import express from 'express';
import handlebars from 'express-handlebars';
import bodyParser from 'body-parser';
import moment from 'moment';

import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';

import schema from './schema';


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
// GraphQL
// https://github.com/apollostack/graphql-server
// http://dev.apollodata.com/tools/graphql-server/index.html
//

app.use(bodyParser.json());                           // JSON post (GraphQL).
app.use(bodyParser.urlencoded({ extended: true }));   // Encoded bodies (Form post).

app.use('/graphql', bodyParser.json(), graphqlExpress({ schema: schema }));

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
      userId: 'minder',
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
