//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

export const RedisDefs = {
  SERVER:     _.get(process.env, 'REDIS_KUE_SERVICE_HOST', '127.0.0.1'),
  PORT:       _.get(process.env, 'REDIS_KUE_SERVICE_PORT', 6379),
};

export const KueDefs = {
  SERVER:     _.get(process.env, 'KUE_SERVER', '127.0.0.1'),
  PORT:       _.get(process.env, 'KUE_PORT', 9000),
  REDIS_DB:   _.get(process.env, 'KUE_DB', 0),
};

export const KueOptions = {

  // https://github.com/Automattic/kue#redis-connection-settings
  redis: {
    host: RedisDefs.SERVER,
    port: RedisDefs.PORT,
    db: KueDefs.REDIS_DB
  }
};
