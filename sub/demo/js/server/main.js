//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

const path = require('path');
const favicon = require('serve-favicon');

const express = require('express');
const handlebars = require('express-handlebars');
const cookieParser = require('cookie-parser');

const http = require('http');
const socketio = require('socket.io');

import moment from 'moment';

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
// http://www.koding.com/docs/what-happened-to-127-0-0-1
//

const LOGGING = false; // TODO(burdon): Get from env.

const env = process.env['NODE_ENV'] || 'development';

const host = (env === 'production') ? '0.0.0.0' : '127.0.0.1';
const port = process.env['VIRTUAL_PORT'] || 3000;

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
  // NOTE: Must rebuild server if modified.
  const webpackConfig = require('../../webpack-dev.config');

  const compiler = webpack(webpackConfig);

  // https://github.com/webpack/webpack-dev-middleware
  app.use(webpackDevMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    noInfo: true,
    stats: { colors: true }
  }));

  app.use(webpackHotMiddleware(compiler, {
    log: (msg) => console.log('### [%s] %s ###', moment().format('hh:mm:ss'), msg)
  }));
}


//
// Middleware
//

app.use(cookieParser());

app.use(bodyParser.json());                           // JSON post (GraphQL).
app.use(bodyParser.urlencoded({ extended: true }));   // Encoded bodies (Form post).


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
// GraphQL server.
// https://github.com/graphql/express-graphql
//

app.use('/graphql', (req, res) => {

  // Intercept response.
  if (req.method == 'POST' && LOGGING) {
    console.log('\n>>> REQ: [{');
    _.each(req.body, (part, key) => {
      switch (typeof part) {

        // Query.
        case 'string':
          part = part.replace(/\n/g, '\n  ');
          break;

        // Variables.
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


//
// Client connections.
//

class ClientManager {

  // TODO(burdon): Connection time.

  constructor() {
    this._sockets = new Map();
  }

  get sockets() {
    return Array.from(this._sockets.values());
  }

  getSocket(socketId) {
    return this._sockets.get(socketId);
  }

  connect(socket) {
    this._sockets.set(socket.id, socket);
  }

  disconnect(socketId) {
    this._sockets.delete(socketId);
  }
}


const clientManager = new ClientManager();

app.get('/clients', function(req, res) {
  res.render('clients', {
    sockets: clientManager.sockets
  });
});

app.post('/client/ping', function(req, res) {
  let socket = clientManager.getSocket(req.body.socketId);
  if (socket) {
    socket.emit('ping', {
      ts: moment().valueOf()
    });
  }

  res.redirect('/clients');
});


//
// Client errors.
//

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
    let config = {
      debug: {
        env: env,
        logging: LOGGING
      },

      userId: username
    };

    res.render('app', { config: config });
  }
});


//
// Socket.io
// http://socket.io/get-started/chat
// https://www.npmjs.com/package/socket.io-client
//

const server = http.Server(app);

const io = socketio(server);

io.on('connection', function(socket) {
  console.log('CLIENT.CONNECTED[%s]', socket.id);
  clientManager.connect(socket);

  socket.on('disconnect', () => {
    console.log('CLIENT.DISCONNECTED[%s]', socket.id);
    clientManager.disconnect(socket.id);
  });
});


//
// Startup.
// https://expressjs.com/en/starter/static-files.html
//

server.listen(port, host, () => {
  let addr = server.address();
  console.log(`### RUNNING[${env}] http://${addr.address}:${addr.port} ###`);
});
