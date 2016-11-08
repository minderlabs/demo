//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

// TODO(burdon): Use webpack

const _ = require('lodash');

const path = require('path');
const http = require('http');
const express = require('express');
const handlebars = require('express-handlebars');
const bodyParser = require('body-parser');

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
// Schema
//

// TODO(burdon): Factor out (share with sub/graphql).
// TODO(burdon): Do client mocking.
// http://dev.apollodata.com/tools/graphql-tools/mocking.html

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
    user: (o, { id }) => {
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

// TODO(burdon): Config hot loader.
app.use('/assets', express.static(path.join(__dirname, '../../dist')));

app.get(/^\/(.*)/, function(req, res) {
  res.render('home', {
    config: {
      root: 'app-root',
      graphql: '/graphql',
      userId: 'minder'
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
