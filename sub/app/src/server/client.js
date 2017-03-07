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
      return res.status(401).end();
    }

    let clientId = req.headers[Const.HEADER.CLIENT_ID];
    let { platform, messageToken } = req.body;

    // Register the client (and create it if necessary).
    let client = clientManager.register(platform, clientId, user.id, messageToken);
    if (!client) {
      return res.status(400).send({ message: 'Invalid client.' });
    }

    // Get group.
    // TODO(burdon): Remove.
    let group = await systemStore.getGroup(user.id);

    // Registration info.
    res.send({
      userId: user.id,
      clientId: client.id,
      groupId: group.id   // TODO(burdon): Remove.
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
    // TODO(burdon): Make persistent.
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

    // TODO(burdon): Flush clients with no activity in 30 days.
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
   * Clients are created at different times for different platforms.
   * Web: Created when the page is served.
   * CRX: Created when the app registers.
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
  register(platform, clientId, userId, messageToken=undefined) {
    console.assert(clientId && userId);

    let client = this._clients.get(clientId);
    if (!client) {
      if (platform !== Const.PLATFORM.WEB) {
        logger.warn('Invalid client for: ' + clientId);
      }

      // Create the client.
      client = this.create(platform, userId);
    } else if (client.userId != userId) {
      logger.error('Invalid user for client: ' + JSON.stringify({ clientId, userId }));
      return null;
    }

    // Register the client.
    client.messageToken = messageToken;
    client.registered = moment().unix();
    logger.log('Registered: ' + clientId);
    return client;
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
