//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

let express = require('express');
let path = require("path");

//
// Simple node server.
//

let app = express();

//
// Config serving static files.
// https://expressjs.com/en/starter/static-files.html
//

app.use(express.static(__dirname + '/'));

//
// Home page.
//

app.use('/', function(req, res) {
  res.sendFile('index.html');
});

//
// Startup.
//

let server = app.listen(8080, 'localhost', function() {
  let addr = server.address();
  console.log('http://%s:%d', addr.address, addr.port);
});
