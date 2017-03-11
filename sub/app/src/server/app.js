//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import moment from 'moment';

import { $$, Logger } from 'minder-core';

import { Const } from '../common/defs';

const logger = Logger.get('app');

//
// Client bundles (map NODE_ENV to bundle).
// See webpack.config.js
//

const WEBPACK_BUNDLE = {
  "test":           "test",
  "development":    "main",
  "production":     "main",
  "hot":            "hot",
  "hot_sidebar":    "hot_sidebar"
};

/**
 * Sets-up serving the app (and related assets).
 *
 * @param {UserManager} userManager
 * @param {ClientManager} clientManager
 * @param systemStore
 * @param options
 * @returns {Router}
 */
export const appRouter = (userManager, clientManager, systemStore, options) => {
  console.assert(userManager && clientManager);
  const router = express.Router();

  // Webpack assets.
  router.use('/assets', express.static(options.assets));

  // Path: /\/app\/(.*)/
  // TODO(burdon): /app should be on separate subdomin (e.g., app.minderlabs.com/inbox)?
  const path = new RegExp(options.root.replace('/', '\/') + '\/?(.*)');

  // Web app.
  router.get(path, function(req, res, next) {
    return userManager.getUserFromCookie(req)
      .then(user => {
        if (!user) {
          // TODO(burdon): Create Router object rather than hardcoding path.
          res.redirect('/');
        } else {
          // Create the client.
          // TODO(burdon): Client should register (might store ID -- esp. if has worker, etc.)
          let client = clientManager.create(user.id, Const.PLATFORM.WEB);

          // Get group.
          // TODO(burdon): Client shouldn't need this (i.e., implicit by current canvas context).
          return systemStore.getGroup(user.id)
            .then(group => {
              // Client app config.
              let config = _.defaults({
                root: Const.DOM_ROOT,

                graphql: '/graphql',
                graphiql: '/graphiql',

                // Authenticated user.
                registration: {
                  userId:   user.id,
                  groupId:  group.id,    // TODO(burdon): Remove.
                  clientId: client.id
                }
              }, options.config);

              logger.log($$('Client options = %o', config));
              res.render('app', {
                bundle: WEBPACK_BUNDLE[config.env],
                config
              });
            });
        }
      })
      .catch(next);
  });

  // Status
  router.get('/status', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(options.config, null, 2));
  });

  return router;
};

//
// Webpack Hot Module Replacement (HMR)
// NOTE: This replaces the stand-alone webpack-dev-server
//
// http://madole.github.io/blog/2015/08/26/setting-up-webpack-dev-middleware-in-your-express-application
// http://webpack.github.io/docs/hot-module-replacement-with-webpack.html
// https://github.com/gaearon/react-hot-loader/tree/master/docs#starter-kits
// https://github.com/gaearon/react-hot-boilerplate/issues/102 [Resolved]
//
// NOTE: Hot mode cannot work with nodemon (must manually reload).
// NOTE: CSS changes will not rebuild (since in separate bundle).
//

export const hotRouter = (options) => {
  const router = express.Router();

  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');

  // Config.
  const webpackConfig = require('../../webpack.config');

  // https://github.com/webpack/webpack-dev-middleware
  const compiler = webpack(webpackConfig);
  router.use(webpackDevMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    noInfo: true,
    stats: { colors: true }
  }));

  // https://github.com/glenjamin/webpack-hot-middleware
  router.use(webpackHotMiddleware(compiler, {
    log: (msg) => console.log('### [%s] %s ###', moment().format('hh:mm:ss'), msg)
  }));

  return router;
};
