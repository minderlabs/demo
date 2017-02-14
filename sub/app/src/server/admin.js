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
  // Environment variables set by kubernetes deployment config.
  // TODO(burdon): Factor out config.
  let queue = kue.createQueue({
    redis: {
      host: _.get(process.env, 'REDIS_KUE_SERVICE_HOST', '127.0.0.1'),
      port: _.get(process.env, 'REDIS_KUE_SERVICE_PORT', 6379),
      db: 0
    }
  });

  // JSON body.
  router.use(bodyParser.json());

  //
  // Admin page.
  //
  router.get('/', function(req, res) {
    res.render('admin', {
      clients: clientManager.clients
    });
  });

  //
  // Admin API.
  //
  router.post('/', function(req, res) {
    let { cmd } = req.body;

    console.log('Admin command: %s', cmd);
    switch (cmd) {
      case 'schedule.test': {
        queue.create('test', {}).save();
        break;
      }

      case 'db.cache.reset': {
        firebase.clearCache();
        break;
      }
    }

    res.send({});
  });

  //
  // https://github.com/Automattic/kue#user-interface
  //
  router.use('/kue', kue.app);

  return router;
};
