//
// Copyright 2016 Minder Labs.
//

'use strict';

import _ from 'lodash';
import express from 'express';
import moment from 'moment';
import path from 'path';

import { requestContext } from './auth';

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
 * @param {ClientManager} clientManager
 * @param options
 * @returns {core.Router|*}
 */
export const appRouter = (clientManager, options) => {
  const router = express.Router();

  options = _.defaults(options, {
    env: 'development',
    graphql: '/graphql'
  });

  // Public assets.
  // https://expressjs.com/en/starter/static-files.html
  router.use(express.static(path.join(__dirname, 'public')));

  // Webpack assets.
  router.use('/assets', express.static(path.join(__dirname, '../../dist')));

  // Client.
  // TODO(burdon): /app should be on separate subdomin (e.g., app.minderlabs.com/inbox)?
  router.get(/^\/app\/?(.*)/, function(req, res) {
    let { userId } = requestContext(req);
    if (!userId) {
      res.redirect('/login');
    } else {
      res.render('app', {
        app: WEBPACK_BUNDLE[options.env],
        config: {
          root: 'app-root',
          userId: userId,
          clientId: clientManager.create(userId).id,
          graphql: options.graphql,
          debug: {
            env: options.env
          }
        }
      });
    }
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
