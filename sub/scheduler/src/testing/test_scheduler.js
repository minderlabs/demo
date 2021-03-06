//
// Copyright 2017 Minder Labs.
//

import _ from 'lodash';

import kue from 'kue-scheduler';

import { KueOptions } from '../defs';
import { JobDefs } from './test_services';

//
// https://github.com/lykmapipo/kue-scheduler
// TODO(burdon): kue-cli
//

// https://github.com/lykmapipo/kue-scheduler#options
let options = _.defaults({
  worker: false
}, KueOptions);

console.log(JSON.stringify(options));

// Create the main queue (client and service).
let queue = kue.createQueue(options);

// Reset everything.
//queue.clear();

// Create the job (client).
let job = queue.createJob(JobDefs.TEST, { foo: 100 });

// Schedule the job (client).
// NOTE: This just wraps kue and schedules a new job when the current is complete.
//queue.every('2 seconds', job);

queue.now(job);

// TODO(burdon): Doesn't quit.
// https://github.com/lykmapipo/kue-scheduler/issues/80
console.log('OK');

// TODO(burdon): Test via curl.
