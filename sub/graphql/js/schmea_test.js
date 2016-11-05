//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

import { mockServer } from 'graphql-tools';

import schema from './data/schema.graphql';

//
// Test data.
//

const DATA = {
  User: {
    test: {
      name: 'Minder'
    }
  }
};

//
// Mocker server.
//

const server = mockServer(schema, {
  RootQuery: () => ({
    user: (o, { id }) => {
      return { id, ...DATA.User[id] };
    }
  })
});

//
// Tests.
//

describe('Schema Tests', () => {

  it('Should be sane.', (done) => {
    expect(true).to.equal(true);

    const query = `
      { 
        user(id: "test") {
          id
          name
        }
      }
    `;

    server.query(query).then((result) => {
      if (result.errors) {
        console.error(result.errors);
        fail();
      } else {
        console.log(result.data);
        expect(result.data.user.name).to.equal(DATA.User.test.name);
        done();
      }
    });
  });
});
