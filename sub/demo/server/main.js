//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

let express = require('express');
let path = require('path');
var favicon = require('serve-favicon');
let { buildSchema } = require('graphql');

let { Schema } = require('../common/data/schema');

const graphqlHTTP = require('express-graphql');

//
// Express node server.
//

const app = express();


//
// GraphQL server.
// https://github.com/graphql/express-graphql
//

app.use('/graphql', graphqlHTTP({
  schema: Schema,
  graphiql: true
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

let server = app.listen(8080, 'localhost', function() {
  let addr = server.address();
  console.log('SERVER: http://%s:%d', addr.address, addr.port);
});
