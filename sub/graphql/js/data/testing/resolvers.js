//
// Copyright 2016 Alien Laboratories, Inc.
//

'use strict';

//
// Test data.
//

export const DATA = {
  User: {
    minder: {
      name: 'Minder'
    }
  }
};

//
// Resolvers.
// http://dev.apollodata.com/tools/graphql-tools/resolvers.html
//

export const resolvers = {
  Query: () => {
    return {
      user: (o, { id }) => {
        return { id, ...DATA.User[id] };
      }
    }
  }
};

export default resolvers;
