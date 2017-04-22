//
// Copyright 2016 Minder Labs.
//

import kue from 'kue-scheduler';
import path from 'path';
import yaml from 'node-yaml';

import { Job } from './job';

import { JobDefs, TestJob } from './testing/test_services';

import ENV from './env';

/**
 * Asynchronously load the configuration.
 */
async function config(baseDir) {
  return await {
    'firebase':         await yaml.read(path.join(baseDir, 'firebase/minder-beta.yml')),
    'firebase_server':  await yaml.read(path.join(baseDir, 'firebase/minder-beta-server.yml')),
    'google':           await yaml.read(path.join(baseDir, 'google.yml'))
  };
}

// TODO(burdon): Factor out scheduler defs (see server.js)
config(ENV.MINDER_CONF_DIR).then(config => {
  console.log('Config = ' + JSON.stringify(config, null, 2));

  // Simple Kue scheduler:
  // https://www.npmjs.com/package/kue
  // - ultra simple API and set-up (10 mins getting started with redis).
  // - not well documented but high adoption and active community.

  // https://github.com/lykmapipo/kue-scheduler#options
  let options = {

    worker: true,

//  restore: true,              // TODO(burdon): Fails.

    // https://github.com/Automattic/kue#redis-connection-settings
    redis: {
      host: ENV.REDIS_SERVER,
      port: ENV.REDIS_PORT,
      db:   ENV.REDIS_DB
    }
  };

  // Create the main queue (client and service).
  let queue = kue.createQueue(options);

  // Register the job processor (service).
  queue.process(JobDefs.TEST, Job.processor(new TestJob()));

  // http://localhost:9000 (UI)
  // TODO(burdon): Use kue-ui with express server.
  if (false) {
    kue.app.listen(ENV.KUE_PORT);
  }
});
