//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import _ from 'lodash';

// TODO(burdon): Use import, etc. (since using babel-node).

const path = require('path');
const http = require('http');
const express = require('express');
const handlebars = require('express-handlebars');
const bodyParser = require('body-parser');

const moment = require('moment');

const graphqlServer = require('graphql-server-express');
const graphqlTools = require('graphql-tools');


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
// Schema
//

// TODO(burdon): Use /relay/dist/schema.graphql?
// TODO(burdon): Factor out (share with sub/graphql).
// TODO(burdon): Client mocking (use same schema).
// http://dev.apollodata.com/tools/graphql-tools/mocking.html

// TODO(burdon): Change to Viewer.

const typeDefs = `
  
  type User {
    id: ID!
    name: String
  }
  
  type RootQuery {
    user(id: ID): User
  }
  
  schema {
    query: RootQuery
  }

`;

const DATA = {
  User: {
    minder: {
      name: 'Minder'
    }
  }
};

const resolvers = {
  RootQuery: {
    user: (node, { id }) => {
      console.log('USER.GET[%s]', id);
      return _.merge({ id }, DATA.User[id]);
    }
  }
};

const schema = graphqlTools.makeExecutableSchema({ typeDefs, resolvers });


//
// GraphQL
// https://github.com/apollostack/graphql-server
// http://dev.apollodata.com/tools/graphql-server/index.html
//

app.use(bodyParser.json());                           // JSON post (GraphQL).
app.use(bodyParser.urlencoded({ extended: true }));   // Encoded bodies (Form post).

app.use('/graphql', bodyParser.json(), graphqlServer.graphqlExpress({ schema: schema }));

app.use('/graphiql', graphqlServer.graphiqlExpress({
  endpointURL: '/graphql',
}));


//
// App
//

app.use('/assets', express.static(path.join(__dirname, '../../dist')));

app.get(/^\/(.*)/, function(req, res) {
  res.render('home', {
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
