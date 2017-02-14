//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';

import kue from 'kue-scheduler';

import { Job } from './job';
import { KueDefs, KueOptions } from './defs';
import { JobDefs, TestJob } from './testing/test_services';

//
// https://www.npmjs.com/package/kue
//

//
// Simple Kue scheduler:
// - ultra simple API and set-up (10 mins getting started with redis).
// - not well documented but high adoption and active community.
//

// https://github.com/lykmapipo/kue-scheduler#options
let options = _.defaults({
//restore: true,    // TODO(burdon): Fails.
  worker: true
}, KueOptions);

console.log(JSON.stringify(options));

// Create the main queue (client and service).
let queue = kue.createQueue(options);

// Register the job processor (service).
queue.process(JobDefs.TEST, Job.processor(new TestJob()));

//
// http://localhost:9000 (UI)
// TODO(burdon): kue-ui (for express server).
//
if (false) {
  kue.app.listen(KueDefs.PORT);
}
