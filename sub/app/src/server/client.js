//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import moment from 'moment';

import { Async, HttpError, Logger } from 'minder-core';
import { hasJwtHeader } from 'minder-services';

import { Const } from '../common/const';

import { PushManager } from './push';

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
 * Client store.
 */
export class ClientStore {

  // TODO(burdon): ALL Async.
  // TODO(burdon): Persistence and Memory versions.
  
  constructor() {
    this._clientMap = new Map();
  }

  /**
   * Get clients sorted by newest first.
   */
  getClients() {
    return new Promise((resolve, reject) => {
      resolve(Array.from(this._clientMap.values()).sort((a, b) => { return b.registered - a.registered }));
    });
  }

  // TODO(burdon): Multiple IDs.
  getClient(clientId) {
    return new Promise((resolve, reject) => {
      console.assert(clientId);
      let client = this._clientMap.get(clientId);
      resolve(client);
    });
  }

  // TODO(burdon): Multiple IDs.
  deleteClient(clientId) {
    return new Promise((resolve, reject) => {
      this._clientMap.delete(clientId);
      resolve();
    });
  }

  saveClient(client) {
    return new Promise((resolve, reject) => {
      console.assert(client);
      this._clientMap.set(client.id, client);
      resolve(client);
    });
  }

  flush() {
    logger.log('Flushing stale clients...');
    // TODO(burdon): Flush clients with no activity in 30 days.
    return new Promise((resolve, reject) => {
      this._clientMap.forEach((client, clientId) => {
        console.assert(client.created);
        let ago = moment().unix() - client.created;
        if (!client.registered && ago > 60) {
          this._clientMap.delete(clientId);
          logger.log('Flushed: ' + JSON.stringify(client));
        }
      });

      resolve();
    });
  }
}

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
 */
export class ClientManager {

  // TODO(burdon): Rename methods: verbClient

  // TODO(burdon): Expire web clients after 1 hour (force reconnect if client re-appears).

  constructor(idGenerator) {
    console.assert(idGenerator);
    this._idGenerator = idGenerator;
    this._clientStore = new ClientStore();
    this._pushManager = new PushManager();
  }

  /**
   * Flush Web clients that haven't registered.
   */
  flush() {
    return this._clientStore.flush();
  }

  getClients() {
    return this._clientStore.getClients();
  }

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
    return this._clientStore.saveClient(client);
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
    return Async.promiseOf(clientId && this._clientStore.getClient(clientId)).then(client => {
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
        return this._clientStore.saveClient(_.assign(client, {
          registered: moment().unix(),
          messageToken
        }));
      }
    }).then(client => {
      logger.log('Registered: ' + JSON.stringify(client));
      return client;
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
    this._clientStore.deleteClient(clientId);
  }

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
    return this._clientStore.getClients().then(clients => {

      // Create map of tokens by platform.
      let messageTokenMap = {};
      _.each(clients, client => {
        if (client.messageToken) {
          console.assert(messageTokenMap[client.messageToken] === undefined ||
                         messageTokenMap[client.messageToken] === client.platform,
            'Multiple platforms for message token: ' + client.messageToken);

          messageTokenMap[client.messageToken] = client.platform;
        }
      });

      if (_.size(messageTokenMap)) {
        // Send to multiple tokens.
        logger.log('Sending invalidations to clients: ' + _.size(messageTokenMap));
        return Promise.all(_.map(messageTokenMap, (platform, messageToken) => {
          return this._pushManager.sendMessage(platform, messageToken, senderId);
        })).catch(error => {
          console.warn('Invalidation failed: ' + error);
        });
      }
    });
  }

  /**
   * Invalidate given client.
   * @param clientId Client to invalidate.
   */
  invalidateClient(clientId) {
    return this._clientStore.getClient(clientId).then(client => {
      if (!client) {
        throw new Error('Invalid client: ' + clientId);
      }

      if (!client.messageToken) {
        logger.warn('No message token for client: ' + clientId);
        return Promise.resolve();
      }

      logger.log('Sending invalidation to client: ' + clientId);
      return this._pushManager.sendMessage(client.platform, client.messageToken, clientId, true);
    });
  }
}
