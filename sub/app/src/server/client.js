//
// Copyright 2016 Minder Labs.
//

import _ from 'lodash';
import express from 'express';
import bodyParser from 'body-parser';
import socketio from 'socket.io';
import moment from 'moment';

import { $$, Logger, IdGenerator } from 'minder-core';

// TODO(burdon): Split up logger for each component.
const logger = Logger.get('client');

/**
 * Client endpoints.
 */
export const clientRouter = (authManager, clientManager, options) => {
  console.assert(authManager && clientManager);
  let router = express.Router();

  // JSON body.
  router.use(bodyParser.json());

  // Registers the client.
  router.post('/client/register', async function(req, res) {
    let { clientId, socketId } = req.body;

    // Get current user.
    let userInfo = await authManager.getUserInfoFromHeader(req);
    if (userInfo) {
      clientManager.register(userInfo.id, clientId, socketId);
    } else {
      res.status(401);
    }

    // Send registration info.
    res.send({
      user: {
        id: userInfo.id
      }
    });
  });

  // Invalidate client.
  router.post('/client/invalidate', function(req, res) {
    let { clientId } = req.body;
    clientManager.invalidate(clientId);
    res.send({});
  });

  return router;
};

/**
 * Manages client connections.
 *
 * Web:
 * 1). Client created (clientId set in config during app serving).
 * 2). Socked connected (gets socketId)
 * 3). Client registered (binds clientId to socketId).
 *
 * TODO(burdon): Native GCM sequence? (Get clientId and socketId in registration).
 */
export class ClientManager {

  // TODO(burdon): Injection?
  static idGenerator = new IdGenerator();

  constructor(socketManager) {
    console.assert(socketManager);
    this._socketManager = socketManager;

    // Listen for disconnected clients.
    this._socketManager.onDisconnect((socketId) => {
      let client = _.find(this._clients, client => client.socketId === socketId);
      if (!client) {
        logger.warn($$('Invalid client: %s', socketId));
      } else {
        client.socketId = null;
      }
    });

    // Map of clients indexed by ID.
    this._clients = new Map();
  }

  /**
   * Called by page loader.
   */
  create(userId) {
    console.assert(userId);

    let client = {
      id: ClientManager.idGenerator.createId(),   // TODO(burdon): Pass into constructor.
      userId: userId,
      socketId: null,
      registered: null
    };

    this._clients.set(client.id, client);
    logger.log($$('CLIENT.CREATED[%s:%s]', client.id, userId));

    return client;
  }

  /**
   * Called by client on start-up.
   * NOTE: mobile devices requet ID here.
   */
  register(userId, clientId, socketId) {
    console.assert(userId, clientId && socketId);

    let client = this._clients.get(clientId);
    if (!client) {
      logger.warn($$('Invalid client: %s', clientId));
    } else {
      if (userId != client.userId) {
        logger.error($$('Invalid user: %s', userId));
      } else {
        logger.log($$('CLIENT.REGISTERED[%s:%s]', clientId, userId));
        client.socketId = socketId;
        client.registered = moment();
      }
    }
  }

  invalidate(clientId) {
    let client = this._clients.get(clientId);
    if (!client) {
      logger.warn($$('Invalid client: %s', clientId));
    } else {
      let socket = this._socketManager.getSocket(client.socketId);
      if (!socket) {
        logger.warn($$('Client not connected: %s', clientId));
      } else {
        logger.warn($$('Invalidating client: %s', clientId));
        socket.emit('invalidate', {
          ts: moment().valueOf()
        });
      }
    }
  }

  // TODO(burdon): Replace this and above with queryId, etc.
  invalidateOthers(clientId) {
    this._clients.forEach((client) => {
      if (client.id != clientId) {
        this.invalidate(client.id);
      }
    });
  }

  // Admin.
  get clients() {
    return Array.from(this._clients.values());
  }
}

/**
 * Manages socket connections.
 */
export class SocketManager {

  // TODO(burdon): Replace with Firebase (now GCM); rather than pusher.io
  // https://firebase.google.com/docs/cloud-messaging

  // TODO(burdon): Use JWT to secure connection?
  // https://auth0.com/blog/auth-with-socket-io
  // https://jwt.io

  constructor(server) {
    this._onDisconnect = null;

    // Map of sockets by session ID.
    this._sockets = new Map();

    //
    // Socket.io
    // http://socket.io/get-started/chat
    // https://www.npmjs.com/package/socket.io-client
    //

    this._io = socketio(server);

    this._io.on('connection', (socket) => {
      logger.log($$('SOCKET.CONNECTED[%s]', socket.id));
      this._sockets.set(socket.id, socket);

      socket.on('disconnect', () => {
        logger.log($$('SOCKET.DISCONNECTED[%s]', socket.id));
        this._sockets.delete(socket.id);
        this._onDisconnect(socket.id);
      });
    });
  }

  onDisconnect(callback) {
    this._onDisconnect = callback;
  }

  /**
   * Get active socket for client.
   * @param socketId
   * @returns {Socket}
   */
  getSocket(socketId) {
    return this._sockets.get(socketId);
  }
}