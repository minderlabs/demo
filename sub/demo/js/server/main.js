//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

const path = require('path');
const favicon = require('serve-favicon');

const express = require('express');
const exphbs = require('express-handlebars');
const cookieParser = require('cookie-parser');

const graphqlHTTP = require('express-graphql');
const bodyParser = require('body-parser');

import schema from '../common/data/schema';

import { Database } from '../common/data/database';


//
// Database singleton.
//

Database.singleton = new Database().init();


//
// Express node server.
//

const port = 8080;

const app = express();


app.use(bodyParser.json());                           // JSON post (GraphQL).
app.use(bodyParser.urlencoded({ extended: true }));   // Encoded bodies (Form post).

app.use(cookieParser());

// https://github.com/ericf/express-handlebars
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));


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

app.post('/debug/graphql', function(req, res) {
  console.log('REQ =', JSON.stringify(req.body, null, 2));

  // Temp Redirect.
  // TODO(burdon): Print response? Configure graphqlHTTP logging?
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
// Login
//

const USER_COOKE = 'username';

app.get('/logout', function(req, res) {
  res.clearCookie(USER_COOKE);
  res.redirect('/login');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  let username = req.body.username;
  if (!username) {
    res.redirect('/login');
  } else {
    // Set user cookie.
    res.cookie('username', username, {});

    // Redirect to app.
    res.redirect('/');
  }
});

app.post('/error', function(req, res) {
  res.render('error', {
    error: req.body.error
  })
});


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
  let username = req.cookies[USER_COOKE];
  if (!username) {
    res.redirect('/login');
  } else {
    res.render('home', {
      username: username
    });
  }
});


//
// Startup.
// https://expressjs.com/en/starter/static-files.html
//

let server = app.listen(port, 'localhost', function() {
  let addr = server.address();
  console.log('STARTED: http://%s:%d', addr.address, addr.port);
});
