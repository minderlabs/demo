//
// Copyright 2016 Minder Labs.
//

/**
 * Simple OO Job abstraction.
 * Preserves standard kue queue API:
 * queue.process(JobDefs.TEST, Job.processor(new TestJob()));
 */
export class Job {

  /**
   * Returns the processor registered with the queue.
   * @param {Job} job Job instance to register.
   * @returns {function(*, *=)}
   */
  static processor(job) {
    return (kueJob, done) => {
      let data = kueJob.data;
      console.log('Processing[%s:%s]: %s', kueJob.type, kueJob.id, JSON.stringify(data));

      // TODO(burdon): Error handling.
      job.process(data).then(done).catch(error => {
        console.error('Failed:', error);
      });
    };
  }

  /**
   * Asynchronously processes the job.
   * @param {object} data Job payload.
   * @return {Promise}
   */
  process(data) {}
}
