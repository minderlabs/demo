//
// Copyright 2016 Minder Labs.
//

import RedisServer from 'redis-server';

import { RedisDefs } from '../defs';

//
// https://www.npmjs.com/package/redis-server
//
const server = new RedisServer(RedisDefs.PORT);

server.open((err) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Redis started...');
  }
});
