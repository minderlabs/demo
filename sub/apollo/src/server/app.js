//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import moment from 'moment';

import { $$, Logger } from 'minder-core';

const logger = Logger.get('app');

//
// Client bundles (map NODE_ENV to bundle).
// See webpack.config.js
//

const WEBPACK_BUNDLE = {
  "test":         "test",
  "development":  "main",
  "production":   "main",
  "hot":          "hot"
};

/**
 * Sets-up serving the app (and related assets).
 *
 * @param {AuthManager} authManager
 * @param {ClientManager} clientManager
 * @param options
 * @returns {core.Router|*}
 */
export const appRouter = (authManager, clientManager, options) => {
  console.assert(authManager && clientManager);
  const router = express.Router();

  options = _.defaults(options, {
    env: 'development',
    graphql: '/graphql'
  });

  logger.log($$('Client options = %o', options));

  // Webpack assets.
  router.use('/assets', express.static(options.assets));

  // Client.
  // TODO(burdon): /app should be on separate subdomin (e.g., app.minderlabs.com/inbox)?
  router.get(/^\/app\/?(.*)/, async function(req, res) {

    // TODO(burdon): Deprecate cookies? Do redirect from app?
    let userInfo = await authManager.getUserInfoFromCookie(req);
    if (!userInfo) {
      // TODO(burdon): Router object.
      res.redirect('/');
    } else {
      // Create the client (and socket).
      let client = clientManager.create(userInfo.id);

      res.render('app', {
        app: WEBPACK_BUNDLE[options.env],
        config: _.defaults({
          root: 'app-root',
          user: userInfo,
          clientId: client.id,
          graphql: options.graphql,
          debug: {
            env: options.env
          }
        }, options.config)
      });
    }
  });

  // Status
  router.get('/status', function(req, res) {
    res.send({
      version: '0.0.1'
    });
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
