//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

const path = require('path');
const favicon = require('serve-favicon');

const express = require('express');
const graphqlHTTP = require('express-graphql');

import schema from '../common/data/schema';

//
// Express node server.
//

const port = 8080;

const app = express();


//
// GraphQL server.
// https://github.com/graphql/express-graphql
//

app.use('/graphql', graphqlHTTP({
  schema: schema,

  graphiql: true,

  formatError: (error) => ({ // better errors for development. `stack` used in `gqErrors` middleware
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack.split('\n') : null,
  }),
}));


//
// Config serving static files (generated webpack assets).
// https://expressjs.com/en/starter/static-files.html
//

app.use('/assets', express.static(__dirname + '/assets'));


//
// https://github.com/expressjs/serve-favicon
//

app.use(favicon(__dirname + '/favicon.ico'));


//
// App routing.
// https://expressjs.com/en/guide/routing.html
// https://expressjs.com/en/4x/api.html#res.sendFile
// NOTE: This path must come last.
// NOTE: Error if path is not recognized:
// TypeError: path must be absolute or specify root to res.sendFile
//

app.get(/^\/(.*)/, function(req, res) {
  res.sendFile('index.html', {
    root: __dirname
  });
});


//
// Startup.
// https://expressjs.com/en/starter/static-files.html
//

let server = app.listen(port, 'localhost', function() {
  let addr = server.address();
  console.log('STARTED: http://%s:%d', addr.address, addr.port);
});
