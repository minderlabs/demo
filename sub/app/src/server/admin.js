//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import kue from 'kue';

import { isAuthenticated } from 'minder-services';

/**
 * Admin endpoints.
 */
export const adminRouter = (clientManager, firebase, resetDatabase, options) => {
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

  //
  // Admin page.
  //
  router.get('/', isAuthenticated('/home', true), (req, res) => {
    res.render('admin', {
      clients: clientManager.clients
    });
  });

  //
  // Admin API.
  //
  router.post('/', isAuthenticated('/home', true), (req, res) => {
    let { action, clientId } = req.body;

    console.log('Admin command: %s', action);
    switch (action) {

      case 'client.flush': {
        clientManager.flush();
        break;
      }

      case 'client.invalidate': {
        clientManager.invalidateClient(clientId);
        break;
      }

      case 'schedule.test': {
        queue && queue.create('test', {}).save();
        break;
      }

      case 'database.reset': {
        resetDatabase && resetDatabase().then(() => {
          console.log('Reset Database');
        });
        break;
      }
    }

    res.send({});
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
