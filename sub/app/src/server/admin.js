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
    res.render('admin', {
      clients: clientManager.clients,
      testing: (options.env !== 'production')
    });
  });

  //
  // Admin API.
  // TODO(burdon): Require
  //
  router.post('/api', isAuthenticated(undefined, true), (req, res, next) => {
    let { action, clientId } = req.body;

    const ok = () => {
      res.send({});
    };

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
