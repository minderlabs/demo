//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import moment from 'moment';

import { Logger, TypeUtil } from 'minder-core';
import { isAuthenticated, getUserSession } from 'minder-services';

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
export const webAppRouter = (userManager, clientManager, systemStore, options) => {
  console.assert(userManager && clientManager);

  const router = express.Router();

  //
  // Webpack assets.
  //
  router.use('/assets', express.static(options.assets));

  //
  // Web app.
  // Path: /\/app\/(.*)/
  // TODO(burdon): /app could be on separate subdomin (e.g., app.minderlabs.com/inbox)?
  //
  const path = new RegExp(options.root.replace('/', '\/') + '\/?(.*)');
  router.get(path, isAuthenticated('/user/login'), function(req, res, next) {
    let user = req.user;

    // Create the client.
    // TODO(burdon): Client should register (might store ID -- esp. if has worker, etc.)
    clientManager.create(user.id, Const.PLATFORM.WEB).then(client => {
      console.assert(client);

      //
      // Client app config.
      // NOTE: This is the canonical shape of the config object.
      // The CRX has to construct this by registering the user (post auth) and client.
      //
      let config = _.defaults({

        // DOM.
        root: Const.DOM_ROOT,

        // Paths.
        graphql: '/graphql',
        graphiql: '/graphiql',

        // Client registration.
        client: _.pick(client, ['id', 'messageToken']),

        // User credentials.
        credentials: _.pick(getUserSession(user), ['id_token', 'id_token_exp']),

        // Canonical profile.
        userProfile: _.pick(user, ['id', 'email', 'displayName', 'photoUrl']),

      }, options.config);

      logger.log('Client config = ' + TypeUtil.stringify(config));

      //
      // Render page.
      //
      res.render('app', {
        bundle: WEBPACK_BUNDLE[config.env],
        loader: config.env === 'production',
        config
      });
    }).catch(next);
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
    log: (msg) => console.log('### [%s] %s ###', moment().format('YYYY-MM-DD HH:mm Z'), msg)
  }));

  return router;
};
