//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import path from 'path';

global.__ENV__ = _.get(process.env, 'NODE_ENV', 'development');

/**
 * Environment variables set in the Dockerfile.
 */
export default {

  REDIS_SERVER:     _.get(process.env, 'REDIS_KUE_SERVICE_HOST', '127.0.0.1'),
  REDIS_PORT:       _.get(process.env, 'REDIS_KUE_SERVICE_PORT', 6379),
  REDIS_DB:         _.get(process.env, 'REDIS_DB', 0),

  KUE_SERVER:       _.get(process.env, 'KUE_SERVER', '127.0.0.1'),
  KUE_PORT:         _.get(process.env, 'KUE_PORT', 9000),

  MINDER_CONF_DIR:  _.get(process.env, 'MINDER_CONF_DIR', path.join(__dirname, '../../app/conf'))
};
