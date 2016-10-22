//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

const path = require('path');
const favicon = require('serve-favicon');

const express = require('express');
const graphqlHTTP = require('express-graphql');
const bodyParser = require('body-parser');

import { Database } from '../common/data/database';

import schema from '../common/data/schema';

Database.singleton = new Database().init();


// TODO(burdon): Webpack integration.
// http://stackoverflow.com/questions/31102035/how-can-i-use-webpack-with-express

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

  pretty: true,

  // TODO(burdon): Errors are swallowed.
  formatError: error => ({
    message: error.message,
    locations: error.locations,
    stack: error.stack
  })
}));


//
// Intercept and log Relay requests.
//

app.use(bodyParser.json());
app.post('/debug/graphql', function(req, res) {
  console.log('REQ =', JSON.stringify(req.body, null, 2));

  // Temp Redirect.
  // TODO(burdon): Print response?
  res.redirect(307, '/graphql');
});


//
// Config serving static files (generated webpack assets and test data).
// https://expressjs.com/en/starter/static-files.html
//

app.use('/assets', express.static(path.join(__dirname, '../../dist')));

app.use('/data', express.static(path.join(__dirname, '../common/data/testing')));


//
// https://github.com/expressjs/serve-favicon
//

app.use(favicon(__dirname + '/static/favicon.ico'));


//
// App routing.
// https://expressjs.com/en/guide/routing.html
// https://expressjs.com/en/4x/api.html#res.sendFile
// NOTE: This path must come last.
// NOTE: Error if path is not recognized:
// TypeError: path must be absolute or specify root to res.sendFile
// TODO(burdon): If rules above fail (e.g., asking for wrong bundle, then you get this page).
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
