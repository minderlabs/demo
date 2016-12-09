//
// Copyright 2016 Minder Labs.
//

'use strict';

import express from 'express';
import bodyParser from 'body-parser';

/**
 * Admin endpoints.
 * TODO(burdon): Injector from nx-util?
 */
export const adminRouter = (clientManager, firebase, options) => {
  console.assert(clientManager && firebase);
  let router = express.Router();

  // JSON body.
  router.use(bodyParser.json());

  router.get('/admin', function(req, res) {
    res.render('admin', {
      clients: clientManager.clients
    });
  });

  router.post('/admin', function(req, res) {
    let { cmd } = req.body;

    console.log('Admin command: %s', cmd);
    switch (cmd) {
      case 'db.cache.reset': {
        firebase.clearCache();
        break;
      }
    }

    res.send({});
  });

  return router;
};
