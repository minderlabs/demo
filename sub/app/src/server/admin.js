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

  //
  // Admin page.
  //
  router.get('/', isAuthenticated('/home', true), (req, res) => {
    return clientManager.getClients().then(clients => {
      res.render('admin', {
        testing: (options.env !== 'production'),
        clients
      });
    });
  });

  //
  // Admin API.
  // TODO(burdon): Authenticate.
  //
  router.post('/api', isAuthenticated(undefined, true), (req, res) => {
    let { action, clientId } = req.body;

    const ok = () => {
      res.send({});
    };

    console.log('Admin command: %s', action);
    switch (action) {

      case 'client.flush': {
        return clientManager.flush().then(ok);
      }

      case 'client.invalidate': {
        return clientManager.invalidateClient(clientId).then(ok);
      }

      case 'schedule.test': {
        queue && queue.create('test', {}).save();
        break;
      }
    }

    if (options.env !== 'production') {
      switch (action) {

        case 'database.dump': {
          return options.handleDatabaseDump().then(ok);
        }

        case 'database.reset': {
          return options.handleDatabaseReset().then(ok);
        }
      }
    }

    ok();
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
