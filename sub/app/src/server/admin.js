//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import kue from 'kue';

/**
 * Admin endpoints.
 */
export const adminRouter = (clientManager, firebase, options) => {
  console.assert(clientManager && firebase);
  let router = express.Router();

  // Kue.
  // TODO(burdon): Factor out config.
  // Environment variables set by kubernetes deployment config.
  let queue = null;
  if (options.scheduler) {
    queue = kue.createQueue({
      redis: {
        host: _.get(process.env, 'REDIS_KUE_SERVICE_HOST', '127.0.0.1'),
        port: _.get(process.env, 'REDIS_KUE_SERVICE_PORT', 6379),
        db: 0
      }
    }).on('error', err => {
      console.warn('Kue Error:', err.code);
    });
  }

  // JSON body.
  router.use(bodyParser.json());

  //
  // Admin page.
  //
  router.get('/', (req, res) => {
    res.render('admin', {
      clients: clientManager.clients
    });
  });

  //
  // Admin API.
  //
  // TODO(burdon): Auth.
  router.post('/', (req, res) => {
    let { action, clientId } = req.body;

    console.log('Admin command: %s', action);
    switch (action) {

      case 'client.flush': {
        clientManager.flush();
        break;
      }

      case 'client.invalidate': {
        clientManager.invalidate(clientId);
        break;
      }

      case 'schedule.test': {
        queue && queue.create('test', {}).save();
        break;
      }
    }

    res.end();
  });

  //
  // https://github.com/Automattic/kue#user-interface
  //
  if (options.scheduler) {
    router.use('/kue', kue.app);
  } else {
    router.use('/kue', (req, res) => {
      res.redirect('/admin');
    });
  }

  return router;
};
