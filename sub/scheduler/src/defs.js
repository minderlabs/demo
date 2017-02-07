//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

export const KueOptions = {
  SERVER:     _.get(process.env, 'KUE_SERVER', '127.0.0.1'),
  PORT:       _.get(process.env, 'KUE_PORT', 9000),
  REDIS_DB:   _.get(process.env, 'KUE_DB', 1),
};

export const RedisOptions = {
  SERVER:     _.get(process.env, 'REDIS_SERVER', '127.0.0.1'),
  PORT:       _.get(process.env, 'REDIS_PORT', 6379),
};
