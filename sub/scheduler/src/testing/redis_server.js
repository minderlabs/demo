//
// Copyright 2016 Minder Labs.
//

import RedisServer from 'redis-server';

import { RedisDefs } from '../defs';

//
// https://www.npmjs.com/package/redis-server
// NOTE: redis must be installed (brew install redis).
//
const server = new RedisServer(RedisDefs.PORT);

server.open(err => {
  if (err) {
    console.error('Error starting up:', err);
  } else {
    console.log('Redis started...');
  }
});
