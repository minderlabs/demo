//
// Copyright 2016 Minder Labs.
//

import express from 'express';
import bodyParser from 'body-parser';
import moment from 'moment';
import request from 'request';

import { Logger } from 'minder-core';

import { FirebaseServerConfig } from '../common/defs';

const logger = Logger.get('client');

/**
 * Client endpoints.
 */
export const clientRouter = (authManager, clientManager, systemStore, options={}) => {
  console.assert(authManager && clientManager);
  let router = express.Router();

  // JSON body.
  router.use(bodyParser.json());

  // Registers the client.
  router.post('/register', async function(req, res) {
    let { platform, clientId, messageToken } = req.body;
    console.assert(platform);

    // Get current user.
    let user = await authManager.getUserFromHeader(req);
    if (user) {
      let userId = user.id;

      // Assign client ID for CRX.
      // TODO(burdon): If web platform then assert.
      if (!clientId) {
        let client = clientManager.create(platform, userId);
        clientId = client.id;
      }

      // Register the client.
      clientManager.register(userId, clientId, messageToken);

      // Get group.
      // TODO(burdon): Client shouldn't need this (i.e., implicit by current canvas context).
      let group = await systemStore.getGroup(userId);
      let groupId = group.id;

      // Registration info.
      res.send({
        clientId,
        groupId,
        userId
      });
    } else {
      res.status(401);
    }
  });

  // Unregister the client
  router.post('/unregister', async function(req, res) {
    let { clientId } = req.body;
    let user = await authManager.getUserFromHeader(req);
    clientManager.unregister(user.id, clientId);
    res.end();
  });

  // Invalidate client.
  router.post('/invalidate', async function(req, res) {
    let { clientId } = req.body;
    await clientManager.invalidate(clientId);
    res.end();
  });

  return router;
};

/**
 * Manages client connections.
 *
 * Web:
 * 1). Server creates client and passes to app config.
 * 2). Client requests FCM token.
 * 3). Client registers with server.
 *
 * CRX:
 * 1). BG page requests FCM token.
 * 2). BG page registers with server.
 * 3). Server creates client and returns config.
 *
 */
export class ClientManager {

  constructor(idGenerator) {
    this._idGenerator = idGenerator;

    // Map of clients indexed by ID.
    // TODO(burdon): Expire web clients after 1 hour (force reconnect if client re-appears).
    this._clients = new Map();
  }

  /**
   * Called by page loader.
   */
  create(platform, userId) {
    console.assert(platform && userId);

    let client = {
      platform,
      id: this._idGenerator.createId('C-'),
      userId: userId,
      messageToken: null,
      registered: null
    };

    this._clients.set(client.id, client);
    logger.log('Created: ' + client.id);

    return client;
  }

  /**
   * Called by client on start-up.
   * NOTE: mobile devices requet ID here.
   */
  register(userId, clientId, messageToken=undefined) {
    console.assert(userId && clientId);

    let client = this._clients.get(clientId);
    if (!client) {
      logger.warn('Invalid client: ' + clientId);
    } else {
      if (userId != client.userId) {
        logger.error('Invalid user: ' + userId);
      } else {
        logger.log('Registered: ' + clientId);
        client.messageToken = messageToken;
        client.registered = moment();
      }
    }
  }

  /**
   * Called by web client on page unload.
   * @param userId
   * @param clientId
   */
  unregister(userId, clientId) {
    console.assert(userId && clientId);

    logger.log('UnRegistered: ' + clientId);
    this._clients.delete(clientId);
  }

  /**
   * Send query invalidations to client.
   * @param clientId
   */
  invalidate(clientId) {
    let client = this._clients.get(clientId);
    if (client && client.messageToken) {
      logger.log('Invalidating: ' + clientId);
      return new Promise((resolve, reject) => {

        // NOTE: key x value pairs only.
        // https://firebase.google.com/docs/cloud-messaging/http-server-ref#downstream-http-messages-json
        let data = {
          command: 'invalidate'
        };

        // Post authenticated request.
        // https://firebase.google.com/docs/cloud-messaging/server#auth
        // https://github.com/request/request#custom-http-headers
        let options = {
          url: 'https://fcm.googleapis.com/fcm/send',

          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key=' + FirebaseServerConfig.messagingServerKey
          },

          body: JSON.stringify({
            to: client.messageToken,
            data
          })
        };

        request.post(options, (error, response, body) => {
          if (error || response.statusCode != 200) {
            // https://firebase.google.com/docs/cloud-messaging/server
            logger.warn(`FCM error [${response.statusCode}]: ${error || response.statusMessage}`);
          } else {
            logger.log('Sent: ' + JSON.stringify(data));
            resolve();
          }
        });
      });
    }

    return Promise.reject('Invalid client: ' + clientId);
  }

  // TODO(burdon): Replace this and above with queryId, etc.
  invalidateOthers(clientId) {
    let promises = [];
    this._clients.forEach(client => {
      if (client.id != clientId) {
        promises.push(this.invalidate(client.id));
      }
    });

    return Promise.all(promises).catch(() => {
      console.warn('Invalidation failed.');
    });
  }

  // Admin.
  get clients() {
    return Array.from(this._clients.values());
  }
}
