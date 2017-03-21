//
// Copyright 2016 Minder Labs.
//

import express from 'express';

/**
 * Testing pages.
 */
export const testingRouter = (options) => {
  let router = express.Router();

  router.get('/crx', function(req, res) {
    res.render('testing/crx');
  });

  return router;
};
