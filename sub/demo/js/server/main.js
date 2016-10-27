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


const LOGGING = true;


//
// Database singleton.
//

Database.singleton = new Database().init();


//
// Express node server.
// http://www.koding.com/docs/what-happened-to-127-0-0-1
//

const host = process.env['NODE_ENV'] == 'production' ? '0.0.0.0' : '127.0.0.1';
const port = process.env['VIRTUAL_PORT'] || 3000;

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

app.use('/graphql', (req, res) => {

  // Intercept response.
  if (req.method == 'POST' && LOGGING) {
    console.log('\n>>> REQ: [{');
    _.each(req.body, (part, key) => {
      switch (typeof part) {
        case 'string':
          part = part.replace(/\n/g, '\n  ');
          break;

        case 'object':
          part = JSON.stringify(part, 0, 2).replace(/\n/g, '\n  ');
          break;
      }

      console.log(key + ':\n  ' + part);
    });
    console.log('}]\n');

    const end = res.end;
    res.end = function(data) {
      console.log('\n<<< RES: [%s]\n', JSON.stringify(JSON.parse(data), 0, 2));
      end.apply(res, arguments);
    };
  }

  // Original GraphQL processor.
  return graphqlHTTP({
    schema: schema,

    pretty: true,

    graphiql: true,

    /**
     * These errors are returned to the client.
     * @param error
     */
    // TODO(burdon): Figure out how to catch in client.
    formatError: error => ({
      message: error.message,
      locations: error.locations,
      stack: error.stack
    })
  })(req, res);
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
  res.render('login', {
    users: Database.singleton.getUsers()
  });
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

let server = app.listen(port, host, () => {
  let addr = server.address();
  console.log(`### RUNNING http://${addr.address}:${addr.port} ###`);
});

console.log('Starting: %s', host);
