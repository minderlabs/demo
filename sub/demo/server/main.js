//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

let express = require('express');
let path = require("path");
let { buildSchema } = require('graphql');

let { Schema } = require('../common/data/schema');

// FIXME move schema to model.js (or schema.js)
/*
let schema = buildSchema(`
  interface Node {
    id: ID!
  }

  type Item : Node {
    id: ID!,
    title: String,
    users: UserConnection
  }

  type User : Node {
    id: ID!,
    name: String
  }

  type userConnection {
    edges: [UserEdge],
    pageInfo: PageInfo!
  }

  type UserEdge {
    cursor: String!,
    node: Item
  }

  type PageInfo {
    hasNextPage: Boolean!,
    hasPreviousPage: Boolean!,
    startCursor: String,
    endCursor: String

  }

  type Query {
    items: Item,
    node(id: ID!): Node
  }
`);
*/

const graphqlHTTP = require('express-graphql');

//
// Simple node server.
//

const app = express();

//
// GraphQL server.
// https://github.com/graphql/express-graphql
//

let root = { title: () => 'Hello let the truth unfurl!' };

app.use('/graphql', graphqlHTTP({
  schema: Schema,
  rootValue: root,
  graphiql: true
}));


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
