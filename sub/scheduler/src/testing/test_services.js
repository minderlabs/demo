//
// Copyright 2017 Minder Labs.
//

import { Job } from '../job';

// Keep defs separate from Job definition (for client separation).
export const JobDefs = {
  TEST: 'test'
};

// Test job.
// https://www.npmjs.com/package/kue#testing
export class TestJob extends Job {
  process(data) {
    return new Promise((resolve, reject) => {

      // TODO(burdon): Test notifications.

      resolve();
    });
  }
}
