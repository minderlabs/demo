//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import moment from 'moment';
import request from 'request';

import { Logger } from 'minder-core';

import { Const, FirebaseServerConfig } from '../common/defs';

const logger = Logger.get('client');

/**
 * Client endpoints.
 */
export const clientRouter = (userManager, clientManager, systemStore, options={}) => {
  console.assert(userManager && clientManager);
  let router = express.Router();

  // JSON body.
  router.use(bodyParser.json());

  // Registers the client.
  router.post('/register', async function(req, res) {
    let user = await userManager.getUserFromHeader(req);
    if (!user) {
      logger.warn('Not authenticated.');
      res.status(401).end();
      return;
    }

    let userId = user.id;

    let { platform, messageToken } = req.body;
    console.assert(platform);

    // Assign client ID for CRX.
    let clientId = req.headers[Const.HEADER.CLIENT_ID];
    if (!clientId) {
      // Web clients are served with their client ID.
      console.assert(platform !== Const.PLATFORM.WEB);
      let client = clientManager.create(platform, userId);
      clientId = client.id;
    }

    // Register the client.
    clientManager.register(clientId, userId, messageToken);

    // Get group.
    // TODO(burdon): Client shouldn't need this (i.e., implicit by current canvas context).
    let group = await systemStore.getGroup(userId);
    let groupId = group.id;

    // Registration info.
    res.send({
      clientId,
      userId,
      groupId     // TODO(burdon): Remove.
    });
  });

  // Unregisters the client.
  router.post('/unregister', async function(req, res) {
    let user = await userManager.getUserFromHeader(req);
    let clientId = req.headers[Const.HEADER.CLIENT_ID];
    clientManager.unregister(clientId, user && user.id);
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
    console.assert(idGenerator);
    this._idGenerator = idGenerator;

    // Map of clients indexed by ID.
    // TODO(burdon): Expire web clients after 1 hour (force reconnect if client re-appears).
    this._clients = new Map();
  }

  /**
   * Get clients sorted by newest first.
   */
  get clients() {
    return Array.from(this._clients.values()).sort((a, b) => { return b.registered - a.registered });
  }

  /**
   * Flush Web clients that haven't registered.
   */
  flush() {
    console.log('Flushing stale clients...');
    this._clients.forEach((client, clientId) => {
      console.assert(client.created);
      let ago = moment().unix() - client.created;
      if (!client.registered && ago > 60) {
        this._clients.delete(clientId);
        console.log('Flushed: ' + JSON.stringify(client));
      }
    });
  }

  /**
   * Called by page loader.
   */
  create(platform, userId) {
    console.assert(platform && userId);

    let client = {
      id: this._idGenerator.createId('C-'),
      platform,
      userId,
      messageToken: null,
      created: moment().unix(),
      registered: null
    };

    this._clients.set(client.id, client);
    logger.log('Created: ' + client.id);
    return client;
  }

  /**
   * Called by clients on start-up (and to refresh tokens, etc.)
   * NOTE: mobile devices requet ID here.
   */
  register(clientId, userId, messageToken=undefined) {
    console.assert(clientId && userId);

    let client = this._clients.get(clientId);
    if (!client) {
      logger.warn('Invalid client: ' + clientId);
    } else {
      if (userId != client.userId) {
        logger.error('Invalid user: ' + userId);
      } else {
        logger.log('Registered: ' + clientId);
        client.messageToken = messageToken;
        client.registered = moment().unix();
      }
    }
  }

  /**
   * Called by web client on page unload.
   * @param clientId
   * @param userId
   */
  unregister(clientId, userId=undefined) {
    console.assert(clientId);

    logger.log('UnRegistered: ' + clientId);
    this._clients.delete(clientId);
  }

  // TODO(burdon): Factor out Cloud Messaging.

  /**
   * Send query invalidations to client.
   * @param clientId
   */
  invalidate(clientId) {
    let client = this._clients.get(clientId);

    if (!client) {
      return Promise.reject('Invalid client: ' + clientId);
    }

    if (!client.messageToken) {
      logger.warn('No message token for client: ' + clientId);
      return;
    }

    logger.log('Invalidating: ' + clientId);
    return new Promise((resolve, reject) => {

      // TODO(burdon): Query invalidation message.
      // NOTE: key x value pairs only.
      // https://firebase.google.com/docs/cloud-messaging/http-server-ref#downstream-http-messages-json
      let data = {
        command: 'invalidate'
      };

      let url;
      if (client.platform === Const.PLATFORM.CRX) {
        // https://developers.google.com/cloud-messaging/downstream
        url = 'https://gcm-http.googleapis.com/gcm/send';
      } else {
        // https://firebase.google.com/docs/cloud-messaging/http-server-ref
        url = 'https://fcm.googleapis.com/fcm/send';
      }

      let options = {
        url,

        // https://firebase.google.com/docs/cloud-messaging/server#auth
        // https://github.com/request/request#custom-http-headers
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'key=' + FirebaseServerConfig.messagingServerKey
        },

        body: JSON.stringify({
          to: client.messageToken,
          data
        })
      };

      // Post authenticated request to GCM/FCM endpoint.
      logger.log(`Sending [${clientId}]: ${JSON.stringify(data)}`);
      request.post(options, (error, response, body) => {
        if (error || response.statusCode != 200) {
          // https://firebase.google.com/docs/cloud-messaging/server
          logger.warn(`Cloud Messaging Error [${response.statusCode}]: ${error || response.statusMessage}`);
        } else {
          resolve();
        }
      });
    });
  }

  invalidateClients(currentClientId=undefined) {
    let promises = [];
    this._clients.forEach(client => {
      if (client.id != currentClientId) {
        promises.push(this.invalidate(client.id));
      }
    });

    return Promise.all(promises).catch(error => {
      console.warn('Invalidation failed: ' + error);
    });
  }
}
