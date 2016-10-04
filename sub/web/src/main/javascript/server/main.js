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
//

app.use(express.static(__dirname + '/../../web'));

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
