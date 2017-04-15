//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';
import path from 'path';

global.__ENV__            = _.get(process.env, 'NODE_ENV', 'development');
global.__DEVELOPMENT__    = (__ENV__ === 'development');
global.__PRODUCTION__     = (__ENV__ === 'production');
global.__TESTING__        = !__PRODUCTION__;
global.__HOT__            = __ENV__.startsWith('hot');

const HOST = _.get(process.env, 'HOST', __PRODUCTION__ ? '0.0.0.0' : '127.0.0.1');
const PORT = _.get(process.env, 'PORT', 3000);

/**
 * Environment variables set in the Dockerfile.
 */
export default {

  HOST, PORT,

  MINDER_BOTKIT:          _.get(process.env, 'MINDER_BOTKIT',         false),
  MINDER_SCHEDULER:       _.get(process.env, 'MINDER_SCHEDULER',      false),

  MINDER_SERVER_URL:      _.get(process.env, 'MINDER_SERVER_URL',     'http://localhost:' + PORT),

  MINDER_SESSION_SECRET:  _.get(process.env, 'MINDER_SESSION_SECRET', 'minder-session-secret'),
  MINDER_JWT_SECRET:      _.get(process.env, 'MINDER_JWT_SECRET',     'minder-jwt-secret'),

  MINDER_NODE_MODULES:    _.get(process.env, 'MINDER_NODE_MODULES',   path.join(__dirname, '../../node_modules')),

  MINDER_CONF_DIR:        _.get(process.env, 'MINDER_CONF_DIR',       path.join(__dirname, '../../conf')),
  MINDER_DATA_DIR:        _.get(process.env, 'MINDER_DATA_DIR',       path.join(__dirname, '../../data')),

  MINDER_ASSETS_DIR:      _.get(process.env, 'MINDER_ASSETS_DIR',     path.join(__dirname, '../../dist')),
  MINDER_PUBLIC_DIR:      _.get(process.env, 'MINDER_PUBLIC_DIR',     path.join(__dirname, './public')),
  MINDER_VIEWS_DIR:       _.get(process.env, 'MINDER_VIEWS_DIR',      path.join(__dirname, './views'))
};
