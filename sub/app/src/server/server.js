//
// Copyright 2017 Minder Labs.
//

import './config';

import path from 'path';
import yaml from 'node-yaml';

import { ErrorUtil, Logger } from 'minder-core';

import ENV from './env';
import Frontend from './frontend';

const logger = Logger.get('server');

/**
 * Asynchronously load the configuration.
 */
async function config(baseDir) {
  return await {
    'analytics':        await yaml.read(path.join(baseDir, 'analytics.yml')),
    'app':              await yaml.read(path.join(baseDir, 'app.yml')),
    'firebase':         await yaml.read(path.join(baseDir, 'firebase/minder-beta.yml')),
    'firebase_server':  await yaml.read(path.join(baseDir, 'firebase/minder-beta-server.yml')),
    'google':           await yaml.read(path.join(baseDir, 'google.yml')),
    'slack':            await yaml.read(path.join(baseDir, 'slack.yml'))
  };
}

//
// Error handling.
//

ErrorUtil.handleErrors(process, error => {
  logger.error(error);
});

//
// Startup.
//

config(ENV.MINDER_CONF_DIR).then(config => {
  new Frontend(config).init().then(frontend => frontend.start());
});
