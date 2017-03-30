//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import moment from 'moment';
import request from 'request';

import { Async, HttpError, Logger } from 'minder-core';
import { hasJwtHeader } from 'minder-services';

import { Const, FirebaseServerConfig } from '../common/defs';

const logger = Logger.get('client');

/**
 * Client endpoints.
 */
// TODO(burdon): Move to minder-services
export const clientRouter = (userManager, clientManager, systemStore, options={}) => {
  console.assert(userManager && clientManager);
  let router = express.Router();

  //
  // Registers the client.
  //
  router.post('/register', hasJwtHeader(), function(req, res) {
    let { platform, messageToken } = req.body;
    let user = req.user;

    // Register the client (and create it if necessary).
    let clientId = req.headers[Const.HEADER.CLIENT_ID];
    clientManager.register(user.id, platform, clientId, messageToken).then(client => {
      if (!client) {
        throw new HttpError('Invalid client: ' + clientId, 400);
      } else {
        res.send({
          client: _.pick(client, ['id', 'messageToken'])
        });
      }
    })
  });

  //
  // Unregisters the client.
  //
  router.post('/unregister', hasJwtHeader(), function(req, res, next) {
    let clientId = req.headers[Const.HEADER.CLIENT_ID];
    let user = req.user;
    clientManager.unregister(user.id, clientId);

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
    // TODO(burdon): Persistence.
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

  // TODO(burdon): Make WEB AND CRX same? (i.e., don't server clientId). Web might also cache ID since service worker.

  /**
   * Clients are created at different times for different platforms.
   * Web: Created when the page is served.
   * CRX: Created when the app registers.
   * @param {string} userId
   * @param {string} platform
   * @param {boolean} registered
   * @param {string} messageToken
   * @returns {Promise<Client>}
   */
  create(userId, platform, registered=false, messageToken=undefined) {
    console.assert(userId && platform, JSON.stringify({ userId, platform }));

    let ts = moment().unix();
    let client = {
      id: this._idGenerator.createId('C-'),
      platform,
      userId,
      created: ts,
      registered: registered && ts,
      messageToken: messageToken
    };

    logger.log('Created: ' + JSON.stringify(_.pick(client, ['platform', 'id'])));
    return this.saveClient(client);
  }

  /**
   * Called by clients on start-up (and to refresh tokens, etc.)
   * NOTE: mobile devices requet ID here.
   * @param {string} userId
   * @param {string} platform
   * @param {string} clientId
   * @param {string} messageToken
   * @returns {Promise<Client>}
   */
  register(userId, platform, clientId=undefined, messageToken=undefined) {
    console.assert(userId && platform, JSON.stringify({ platform, userId }));
    logger.log('Registering: ' + JSON.stringify({ platform, clientId }));

    // Get existing client.
    return Async.promiseOf(clientId && this.getClient(clientId)).then(client => {
      if (client) {
        // TODO(burdon): Check created time matches?
        // Verify existing client matches registration.
        // NOTE: In testing random number seed is the same, so there may be conflicts.
        if (client.platform !== platform || client.userId !== userId) {
          logger.warn('Existing client does not match: ' + JSON.stringify(client));
          client = null;
        }
      } else if (clientId) {
        logger.warn('Invalid or expired client: ' + clientId);
      }

      if (!client) {
        // Create a new client if required.
        return this.create(userId, platform, true, messageToken);
      } else {
        // Update the existing client.
        return this.saveClient(_.assign(client, {
          registered: moment().unix(),
          messageToken
        }));
      }
    }).then(client => {
      logger.log('Registered: ' + JSON.stringify(client));
      return client;
    });
  }

  // TODO(burdon): Make persistent.

  getClient(clientId) {
    return new Promise((resolve, reject) => {
      console.assert(clientId);
      resolve(this._clients.get(clientId));
    });
  }

  saveClient(client) {
    return new Promise((resolve, reject) => {
      console.assert(client);
      this._clients.set(client.id, client);
      resolve(client);
    });
  }

  /**
   * Called by web client on page unload.
   * @param userId
   * @param clientId
   */
  // TODO(burdon): Async.
  unregister(userId, clientId) {
    console.assert(userId && clientId, JSON.stringify({ userId, clientId }));

    logger.log('UnRegistered: ' + clientId);
    this._clients.delete(clientId);
  }

  // TODO(burdon): Factor out Cloud Messaging.

  /**
   * Invalidate all clients.
   *
   * NOTE: Clients may share the same push token (one per browser), so the sender will also receive the
   * invalidation but may choose to ignore it.
   *
   * @param senderId Client ID of sender.
   * @return {Promise}
   */
  invalidateClients(senderId=undefined) {

    // Create map of tokens by platform.
    let messageTokenMap = {};
    _.each(_.toArray(this._clients.values()), client => {
      if (client.messageToken) {
        console.assert(messageTokenMap[client.messageToken] === undefined ||
                       messageTokenMap[client.messageToken] === client.platform,
          'Multiple platforms for message token: ' + client.messageToken);

        messageTokenMap[client.messageToken] = client.platform;
      }
    });

    if (_.size(messageTokenMap) === 0) {
      return Promise.resolve();
    }

    // Send to multiple tokens.
    logger.log('Sending invalidations to clients: ' + _.size(messageTokenMap));
    return Promise.all(_.map(messageTokenMap, (platform, messageToken) => {
      return this.sendMessage(platform, messageToken, senderId);
    })).catch(error => {
      console.warn('Invalidation failed: ' + error);
    });
  }

  /**
   * Invalidate given client.
   * @param clientId Client to invalidate.
   */
  invalidateClient(clientId) {
    let client = this._clients.get(clientId);

    if (!client) {
      return Promise.reject('Invalid client: ' + clientId);
    }

    if (!client.messageToken) {
      logger.warn('No message token for client: ' + clientId);
      return Promise.resolve();
    }

    logger.log('Sending invalidation to client: ' + clientId);
    return this.sendMessage(client.platform, client.messageToken, clientId, true);
  }

  /**
   * Send push message.
   *
   * @param platform Client platform.
   * @param senderId Client ID of sender.
   * @param messageToken
   * @param force
   * @return {Promise}
   */
  sendMessage(platform, messageToken, senderId, force=false) {
    return new Promise((resolve, reject) => {

      // TODO(burdon): Query invalidation message (see CloudMessenger).
      // NOTE: key x value pairs only.
      // https://firebase.google.com/docs/cloud-messaging/http-server-ref#downstream-http-messages-json
      let data = {
        command: 'invalidate',
        senderId,
        force
      };

      let url;
      if (platform === Const.PLATFORM.CRX) {
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
          // No support for multiple recipients.
          to: messageToken,

          data
        })
      };

      // Post authenticated request to GCM/FCM endpoint.
      // https://firebase.google.com/docs/cloud-messaging/server
      logger.log('Sending message: ' + messageToken, JSON.stringify(data));
      request.post(options, (error, response, body) => {
        if (error || response.statusCode !== 200) {
          throw new Error(`Messaging Error [${response.statusCode}]: ${error || response.statusMessage}`);
        } else {
          resolve();
        }
      });
    });
  }
}
