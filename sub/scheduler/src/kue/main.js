//
// Copyright 2016 Minder Labs.
//

import kue from 'kue-scheduler';

import { Job } from './job';

import { KueOptions, RedisOptions } from '../defs';

//
// Simple Kue scheduler:
// - ultra simple API and set-up (10 mins getting started with redis).
// - not well documented but high adoption and active community.
//

// TODO(burdon): kue-cli
// TODO(burdon): kue-ui (for express server).

const options = {

  // https://github.com/Automattic/kue#redis-connection-settings
  redis: {
    host: RedisOptions.SERVER,
    port: RedisOptions.PORT,
    db: KueOptions.REDIS_DB
  }
};

// Keep defs separate from Job definition (for client separation).
const JobDefs = {
  TEST: 'test'
};

// Test job.
// TODO(burdon): Unit test.
// https://www.npmjs.com/package/kue#testing
class TestJob extends Job {
  process(data) {
    return new Promise((resolve, reject) => {
      resolve();
    });
  }
}

// Main queue.
let queue = kue.createQueue();

// Service.
queue.process(JobDefs.TEST, Job.processor(new TestJob()));

// Client.
let job = queue.createJob(JobDefs.TEST, Job.data({ foo: 100 }));

// Scheduler.
queue.every('2 seconds', job);

//
// http://localhost:9000
//
console.log('Starting Kue...');
kue.app.listen(KueOptions.PORT);
